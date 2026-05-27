import { startSession } from "mongoose";
import { CreateGroupChatDto } from "../dtos/request/conversation.dto";
import { ConversationDetailResponseDto, ConversationSummaryResponseDto } from "../dtos/response/conversation.dto";
import { InternalServerException } from "../middlewares/formatResponse/exception/customException";
import {
    createConversation,
    createDirectConversation,
    findConversationById,
    findConversationByIdAndType,
    findConversationsByUserId,
    findDirectConversation
} from "../repositories/conversation.repository";
import {
    currentUserMemberInfo,
    findConversationIdsByUserId,
    findMembersByConversationId,
    findMembersWithUserDetails,
    insertDirectChatMembers,
    insertManyUserToConversation,
    MemberWithUser
} from "../repositories/member.repository";
import { countMessagesUnRead } from "../repositories/message.repository";
import { plainToInstance } from "class-transformer";
import { CursorPaginateResponse } from "../dtos/response/pagination.dto";

const formatConversationResponse = async(conversationId: string, currentUserId: string): Promise<ConversationDetailResponseDto> => {
    // GỌI SONG SONG ĐỂ TỐI ƯU TỐC ĐỘ (Promise.all)
    const [conversation, members, currentMember] = await Promise.all([
        findConversationById(conversationId),
        findMembersByConversationId(conversationId),
        currentUserMemberInfo(conversationId, currentUserId)
    ]);

    if (!conversation || !currentMember) {
        throw InternalServerException('Dữ liệu không nhất quán');
    }

    // Tối ưu unreadCount: Không đếm tin nhắn do chính mình gửi
    let unreadCount = 0;
    if (currentMember.lastReadAt) {
        unreadCount = await countMessagesUnRead(conversationId, currentUserId, currentMember.lastReadAt);
    }

    const typedMembers = members as MemberWithUser[];
    const otherMember = typedMembers.filter((m) => m.userId._id.toString() !== currentUserId);
    const name = conversation.type === 'DIRECT'
        ? otherMember && otherMember.length > 0
            ? `${otherMember[0].userId.firstName} ${otherMember[0].userId.lastName}`.trim() || 'Cuộc trò chuyện'
            : 'Cuộc trò chuyện'
        : conversation.name;

    return {
        id: conversationId,
        name: name,
        type: conversation.type,
        memberCount: conversation.memberCount,
        myMembership: {
            role: currentMember.role,
            status: currentMember.status,
            lastReadAt: currentMember.lastReadAt,
            unreadCount
        },
        participants: typedMembers.map((m) => ({
            userId: m.userId._id.toString(),
            firstName: m.userId.firstName,
            lastName: m.userId.lastName,
            role: m.role,
        }))
    };
}

const buildResponseFromData = (
    conversationId: string,
    conversationName: string,
    conversationType: string,
    populatedMembers: MemberWithUser[],
    currentUserId: string,
    currentUserRole: string,
): ConversationDetailResponseDto =>{
    const otherMember = populatedMembers.find((m) => m.userId._id.toString() !== currentUserId);
    const name = conversationType === 'DIRECT'
        ? otherMember
            ? `${otherMember.userId.firstName} ${otherMember.userId.lastName}`.trim() || 'Cuộc trò chuyện'
            : 'Cuộc trò chuyện'
        : conversationName;

    return {
        id: conversationId,
        name,
        type: conversationType,
        memberCount: populatedMembers.length,
        myMembership: {
            role: currentUserRole,
            status: 'ACCEPTED',
            lastReadAt: null,
            unreadCount: 0
        },
        participants: populatedMembers.map((m) => ({
            userId: m.userId._id.toString(),
            firstName: m.userId.firstName,
            lastName: m.userId.lastName,
            role: m.role,
        }))
    };
}

// Tạo nhóm chat mới
export const createGroupChatService = async (creatorId: string, dto: CreateGroupChatDto): Promise<ConversationDetailResponseDto> => {
    const session = await startSession();
        session.startTransaction();
        try {
            const newConversation = await createConversation(dto, session);
            await insertManyUserToConversation (
                newConversation._id.toString(), creatorId, dto.participantIds, session
            );

            await session.commitTransaction();

            const allUserIds = [creatorId, ...dto.participantIds];
            const populatedMembers = await findMembersWithUserDetails (
                newConversation._id.toString(),
                allUserIds
            ) as MemberWithUser[];

            return buildResponseFromData(
                newConversation._id.toString(),
                dto.name,
                'GROUP',
                populatedMembers,
                creatorId,
                'OWNER',
            );
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

    if (sharedConvs.length > 0) {
        const convIds = sharedConvs.map(c => c._id);
        const conv = await findConversationByIdAndType(convIds);
        if (conv) return formatConversationResponse(conv._id.toString(), userId1);
    }

    const session = await startSession();
    session.startTransaction();
    try {
        const newConv = await createDirectConversation(session);

        await insertDirectChatMembers(newConv._id.toString(), userId1, userId2, session);

        await session.commitTransaction();

        const populatedMembers = await findMembersByConversationId(newConv._id.toString()) as MemberWithUser[];

        return buildResponseFromData(
            newConv._id.toString(),
            '',
            'DIRECT',
            populatedMembers,
            userId1,
            'MEMBER',
        );
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