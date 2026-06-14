import { startSession } from "mongoose";
import 'dotenv/config';
import { CreateGroupChatDto } from "../dtos/request/conversation.dto";
import { ConversationDetailResponseDto, ConversationNameResponseDto, ConversationSummaryResponseDto } from "../dtos/response/conversation.dto";
import { InternalServerException } from "../middlewares/formatResponse/exception/customException";
import {
    changeConversationInviteCode,
    changeConversationPrivacy,
    changeConversationType,
    clearConversationDeleteBy,
    createConversation,
    createDirectConversation,
    findConversationsByUserId,
    findDirectConversation,
    getConversationByInviteCode
} from "../repositories/conversation.repository";
import {
    findMembersDirectByConversationId,
    currentUserMemberInfo,
    findConversationIdsByUserId,
    findMyMemberInfo,
    insertDirectChatMembers,
    insertManyUserToConversation,
    MemberWithUser,
    getMyMemberRoleInGroupChat
} from "../repositories/member.repository";
import { countMessagesUnRead } from "../repositories/message.repository";
import { plainToInstance } from "class-transformer";
import { CursorPaginateResponse } from "../dtos/response/pagination.dto";
import { ConversationPrivacy, ConversationType } from "../schemas/conversation.schema";
import { MemberRole, MemberStatus } from "../schemas/member.schema";
import { randomBytes } from 'crypto';
import { emitToRoom, emitToUser, joinRoom } from "./socket.service";

const generateInviteCode = () => {
    return randomBytes(8).toString('base64url');
};

// Tạo nhóm chat mới
export const createGroupChatService = async (creatorId: string, dto: CreateGroupChatDto): Promise<ConversationDetailResponseDto> => {
    const inviteCode = generateInviteCode();
    const session = await startSession();
    session.startTransaction();
    try {
        const newConversation = await createConversation(dto, inviteCode, session);
        await insertManyUserToConversation (
            newConversation._id.toString(), creatorId, dto.participantIds, session
        );

        await session.commitTransaction();

        const allMemberIds = [creatorId, ...dto.participantIds];
        const groupId = newConversation._id.toString();

        // Lùa tất cả các thành viên (đang online) vào phòng trước
        allMemberIds.forEach(userId => {
            joinRoom(userId, groupId);
        });

        // Dùng 1 lệnh phát loa duy nhất cho toàn bộ căn phòng
        emitToRoom(groupId, 'new_group_created', {
            type: 'NEW_GROUP_CREATED',
            message: `Bạn đã được thêm vào nhóm chat "${newConversation.name}"`,
            data: {
                id: groupId,
                name: dto.name,
                type: ConversationType.GROUP,
                privacy: dto.privacy,
                memberCount: dto.participantIds.length + 1
            }
        });

        return {
            id: newConversation._id.toString(),
            name: dto.name,
            type: ConversationType.GROUP,
            privacy: dto.privacy,
            memberCount: dto.participantIds.length + 1,
            myMembership: {
                role: MemberRole.OWNER,
                status: MemberStatus.ACCEPTED,
                lastReadAt: null,
                unreadCount: 0
            }
        };
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Không thể tạo nhóm chat.');
    } finally {
        await session.endSession();
    }
}

// Find or Create cuộc trò chuyện trực tiếp giữa 2 người
export const findOrCreateDirectChatService = async(userId1: string, userId2: string): Promise<ConversationDetailResponseDto> =>{
    const sharedConvs = await findDirectConversation(userId1, userId2);

    if (sharedConvs !== null) {
        const [otherMember, currentMember] = await Promise.all([
            findMembersDirectByConversationId(userId1, sharedConvs._id.toString()),
            currentUserMemberInfo(sharedConvs._id.toString(), userId1)
        ]);
        if (!otherMember || !currentMember) {
            throw InternalServerException('Dữ liệu không nhất quán');
        }

        let unreadCount = 0;
        if (currentMember.lastReadAt) {
            unreadCount = await countMessagesUnRead(sharedConvs._id.toString(), userId1, currentMember.lastReadAt);
        }
        return {
            id: sharedConvs._id.toString(),
            name: `${otherMember.userId.firstName} ${otherMember.userId.lastName}`.trim() || 'Cuộc trò chuyện',
            type: sharedConvs.type,
            privacy: sharedConvs.privacy,
            memberCount: sharedConvs.memberCount,
            myMembership: {
                role: MemberRole.MEMBER,
                status: MemberStatus.ACCEPTED,
                lastReadAt: currentMember.lastReadAt,
                unreadCount
            }
        };
    }

    const session = await startSession();
    session.startTransaction();
    try {
        const newConv = await createDirectConversation(session);

        await insertDirectChatMembers(newConv._id.toString(), userId1, userId2, session);

        await session.commitTransaction();

        const otherMember = await findMembersDirectByConversationId(userId1, newConv._id.toString()) as MemberWithUser;

        const allMemberIds = [userId1, userId2];

        allMemberIds.forEach(userId => {
            joinRoom(userId, newConv._id.toString());
        });

        return {
            id: newConv._id.toString(),
            name: `${otherMember.userId.firstName} ${otherMember.userId.lastName}`.trim() || 'Cuộc trò chuyện',
            type: ConversationType.DIRECT,
            privacy: ConversationPrivacy.PRIVATE,
            memberCount: 2,
            myMembership: {
                role: MemberRole.MEMBER,
                status: MemberStatus.ACCEPTED,
                lastReadAt: null,
                unreadCount: 0
            }
        };
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Lỗi tạo chat 1-1');
    } finally {
        await session.endSession();
    }
}

// Lấy danh sách các conversation của người dùng
export const getMyConversationsService = async (userId: string, limit=20, cursor?: string)
    : Promise< CursorPaginateResponse<ConversationSummaryResponseDto>> => {
        const conversationIds = await findConversationIdsByUserId(userId);

        const filter: any = {
            _id: { $in: conversationIds },
        };

        if (cursor) {
            filter.lastMessageAt = { $lt: new Date(cursor) };
        }

        const conversations = await findConversationsByUserId(limit, filter);

        const hasNextPage = conversations.length > limit;
        const data = hasNextPage ? conversations.slice(0, limit) : conversations;
        const nextCursor = hasNextPage ? (data[data.length - 1]?.lastMessageAt ?? null) : null;
        await Promise.all(conversations.filter(c => c.type === ConversationType.DIRECT).map(async c => {
            const otherMember = await findMembersDirectByConversationId(userId, c._id.toString());
            if(!otherMember) return;
            c.name = `${otherMember.userId.firstName} ${otherMember.userId.lastName}`.trim() || 'Cuộc trò chuyện';
        }));
        const result = data.map(conv => plainToInstance(ConversationSummaryResponseDto, conv, {
            excludeExtraneousValues: true,
        }));

        return {
            data: result,
            meta:{
                nextCursor: nextCursor ? nextCursor.toISOString() : null,
                hasNextPage
            }
        };
}

// Thay đổi privacy của cuộc trò chuyện
export const changeConversationPrivacyService = async (userId: string, conversationId: string, privacy: ConversationPrivacy): Promise<void> => {
    const currentUser = await findMyMemberInfo(conversationId, userId);
    if (!currentUser) {
        throw InternalServerException('Bạn không phải là thành viên của cuộc trò chuyện này');
    }
    if (currentUser.memberRole === MemberRole.MEMBER) {
        throw InternalServerException('Bạn không có quyền thay đổi privacy của cuộc trò chuyện này');
    }
    await changeConversationPrivacy(conversationId, privacy);
}

// Thay đổi type của cuộc trò chuyện
export const changeConversationTypeCommunityService = async (userId: string, conversationId: string): Promise<void> => {
    const currentUser = await findMyMemberInfo(conversationId, userId);
    if (!currentUser) {
        throw InternalServerException('Bạn không phải là thành viên của cuộc trò chuyện này');
    }
    if (currentUser.memberRole === MemberRole.MEMBER) {
        throw InternalServerException('Bạn không có quyền thay đổi type của cuộc trò chuyện này');
    }
    const session = await startSession();
    session.startTransaction();
    try {
        await changeConversationType(conversationId, ConversationType.COMMUNITY, session);
        await clearConversationDeleteBy(conversationId, session);

        emitToRoom(conversationId, 'conversation_type_changed', {
            type: 'CONVERSATION_TYPE_CHANGED',
            message: 'Nhóm đã được nâng cấp thành Cộng đồng!',
            data: {
                conversationId: conversationId,
                newType: ConversationType.COMMUNITY
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Lỗi thay đổi type của cuộc trò chuyện');
    } finally {
        await session.endSession();
    }
}

// Lấy link mời tham gia cuộc trò chuyện
export const getInviteLinkService = async (userId: string, token: string) => {
    const memberRole = await getMyMemberRoleInGroupChat(token, userId);
    if (!memberRole || memberRole === MemberRole.MEMBER) {
        throw InternalServerException('Bạn không có quyền lấy link mời tham gia cuộc trò chuyện này');
    }
    return {
        inviteLink: `${process.env.BACKEND_URL}/conversations/name/${token}`
    };
}

// Lấy tên của nhóm chat
export const getConversationNameService = async (token: string): Promise<ConversationNameResponseDto> => {
    const conversation = await getConversationByInviteCode(token);
    return {
        id: conversation?._id.toString() || null,
        name: conversation?.name || null
    };
};

// Thay đổi link mời tham gia nhóm chat
// Lấy link mời tham gia cuộc trò chuyện
export const changeInviteLinkService = async (userId: string, conversationId: string) => {
    const member = await findMyMemberInfo(conversationId, userId);
    if (!member || member.memberRole === MemberRole.MEMBER) {
        throw InternalServerException('Bạn không có quyền thay đổi link mời tham gia cuộc trò chuyện này');
    }
    const inviteCode = generateInviteCode();
    await changeConversationInviteCode(conversationId, inviteCode);
    return {
        inviteLink: `${process.env.BACKEND_URL}/conversations/name/${inviteCode}`
    }
}
