import { startSession, Types } from "mongoose";
import { BadRequestException, ConflictException, InternalServerException } from "../middlewares/formatResponse/exception/customException";
import {
    getConversationInfo,
    changeConversationMemberCount,
} from "../repositories/conversation.repository";
import {
    addUserToConversation,
    checkMembersByConversationId,
    findMyMemberInfo,
    getMembersByConversationId,
    saveMember
} from "../repositories/member.repository";
import { MemberRole, MemberStatus } from "../schemas/member.schema";
import { ConversationPrivacy } from "../schemas/conversation.schema";
import { CursorPaginateResponse } from "../dtos/response/pagination.dto";
import { MemberInfoDto } from "../dtos/response/conversation.dto";

// Thêm thành viên vào cuộc trò chuyện
export const addUserToConversationService = async (userId: string, conversationId: string, userIds: string[]) => {
    if (!userIds || userIds.length === 0) {
        throw BadRequestException('Danh sách thành viên thêm vào không được để trống.');
    }
    // Lấy thông tin của mình và thông tin cuộc trò chuyện song song
    const [currentUser, conversationInfo] = await Promise.all([
        findMyMemberInfo(conversationId, userId),
        getConversationInfo(conversationId)
    ]);
    if (!currentUser || !conversationInfo) {
        throw InternalServerException('Không tìm thấy thông tin cuộc trò chuyện hoặc thành viên');
    }

    const session = await startSession();
    session.startTransaction();
    try {
        // Lấy ra TẤT CẢ lịch sử của những userIds này trong nhóm chat
        const existingMembers = await checkMembersByConversationId(conversationId, userIds, session);

        // Biến mảng thành Map để tra cứu nhanh bằng userId thay vì mảng ngẫu nhiên
        const existingMemberMap = new Map(
            existingMembers.map(member => {
                const memberUserId = (member.userId as any)?._id?.toString() ?? member.userId.toString();
                return [memberUserId, member];
            })
        );

        const joinedAt = new Date();

        let addedCount = 0; // Đếm số lượng người thực sự được add thành công

        // Quét từng user được gửi lên
        for (const targetUserId of userIds) {
            const existingMember = existingMemberMap.get(targetUserId);

            if (existingMember) {
                // Nếu đang trong nhóm -> Bỏ qua
                if (existingMember.status === MemberStatus.ACCEPTED) {
                    continue;
                }

                // Nếu Role của người đang thao tác không phải là MEMBER -> Có quyền duyệt tất cả các trường hợp
                if (currentUser.memberRole !== MemberRole.MEMBER) {
                    existingMember.status = MemberStatus.ACCEPTED;
                    existingMember.memberRole = MemberRole.MEMBER;
                    existingMember.joinAt = joinedAt;
                    await saveMember(existingMember, session);
                    addedCount++;
                } else {
                    // Role là MEMBER
                    // Nếu đang bị REMOVED -> Bỏ qua (không có quyền add lại)
                    if (existingMember.status === MemberStatus.REMOVED) {
                        continue;
                    }

                    // Nếu nhóm là PRIVATE
                    if (conversationInfo.privacy === ConversationPrivacy.PRIVATE) {
                        // Nếu đang bị PENDING -> Bỏ qua
                        if (existingMember.status === MemberStatus.PENDING) {
                            continue;
                        }
                        // Nếu là LEFT -> Cho vào lại nhưng ở trạng thái PENDING (chờ duyệt)
                        existingMember.status = MemberStatus.PENDING;
                        existingMember.memberRole = MemberRole.MEMBER;
                        await saveMember(existingMember, session);
                    } else {
                        // Nếu nhóm là PUBLIC -> Cho vào lại luôn ở trạng thái ACCEPTED
                        existingMember.status = MemberStatus.ACCEPTED;
                        existingMember.memberRole = MemberRole.MEMBER;
                        existingMember.joinAt = joinedAt;
                        await saveMember(existingMember, session);
                        addedCount++;
                    }
                }
            } else {
                // Tạo mới thành viên mới nếu chưa từng có lịch sử nào trong nhóm
                if (conversationInfo.privacy === ConversationPrivacy.PRIVATE && currentUser.memberRole === MemberRole.MEMBER) {
                    await addUserToConversation(conversationId, targetUserId, MemberRole.MEMBER, MemberStatus.PENDING, joinedAt, session);
                } else {
                    await addUserToConversation(conversationId, targetUserId, MemberRole.MEMBER, MemberStatus.ACCEPTED, joinedAt, session);
                    addedCount++;
                }
            }
        }

        // Nếu không có ai được add (do tất cả mọi người được chọn đều ĐÃ CÓ trong nhóm)
        if (addedCount === 0) {
            throw ConflictException('Tất cả người dùng được chọn đã ở trong nhóm.');
        }

        //Cập nhật lại tổng số lượng thành viên
        await changeConversationMemberCount(conversationId, addedCount, session);

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Không thể thêm thành viên vào cuộc trò chuyện.');
    } finally {
        await session.endSession();
    }
}

// Rời khỏi cuộc trò chuyện
export const leftConversationService = async (userId: string, conversationId: string) => {
    const memberInfo = await findMyMemberInfo(conversationId, userId);
    if (!memberInfo) {
        throw BadRequestException('Không tìm thấy thông tin thành viên trong cuộc trò chuyện.');
    }
    if (memberInfo.status !== MemberStatus.ACCEPTED) {
        throw BadRequestException('Bạn không phải là thành viên của cuộc trò chuyện này.');
    }
    memberInfo.status = MemberStatus.LEFT;
    memberInfo.leftAt = new Date();
    await saveMember(memberInfo);
    await changeConversationMemberCount(conversationId, -1);
}

// Tạo cuộc trò chuyện 1-1
export const removeUserFromConversationService = async (userId: string, targetUserId: string, conversationId: string) => {
    const [currentUser, targetMember] = await Promise.all([
        findMyMemberInfo(conversationId, userId),
        findMyMemberInfo(conversationId, targetUserId)
    ]);
    if (!currentUser || !targetMember) {
        throw BadRequestException('Không tìm thấy thông tin thành viên trong cuộc trò chuyện.');
    }
    if (currentUser.memberRole === MemberRole.MEMBER) {
        throw BadRequestException('Chỉ quản trị viên mới có thể xóa thành viên khỏi cuộc trò chuyện.');
    }
    targetMember.status = MemberStatus.REMOVED;
    targetMember.leftAt = new Date();
    await saveMember(targetMember);
    await changeConversationMemberCount(conversationId, -1);
}

// Chấp nhận lời mời vào nhóm chat
export const acceptInvitationService = async (userId: string, targetUserId: string, conversationId: string) => {
    const [currentUser, targetMember] = await Promise.all([
        findMyMemberInfo(conversationId, userId),
        findMyMemberInfo(conversationId, targetUserId)
    ]);
    if (!currentUser || !targetMember) {
        throw BadRequestException('Không tìm thấy thông tin thành viên trong cuộc trò chuyện.');
    }
    if (currentUser.memberRole === MemberRole.MEMBER) {
        throw BadRequestException('Chỉ quản trị viên mới có thể accept user vào group.');
    }
    if(targetMember.status !== MemberStatus.PENDING){
        throw BadRequestException('Thành viên này không có lời mời nào đang chờ để được chấp nhận.');
    }
    targetMember.status = MemberStatus.ACCEPTED;
    targetMember.joinAt = new Date();
    await saveMember(targetMember);
    await changeConversationMemberCount(conversationId, 1);
}

// Lấy danh sách các conversation của người dùng
export const getMembersInfoByConversationIdService = async (userId: string, conversationId: string, limit=20, cursor?: string)
    : Promise< CursorPaginateResponse<MemberInfoDto>> => {

    const memberInfo = await findMyMemberInfo(conversationId, userId);
    if (!memberInfo) {
        throw BadRequestException('Bạn không phải là thành viên của cuộc trò chuyện.');
    }

    const filter: any = {
        _id: conversationId,
    };

    if (cursor) {
        filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const members = await getMembersByConversationId(limit, filter);

    const hasNextPage = members.length > limit;
    const result = hasNextPage ? members.slice(0, limit) : members;
    const nextCursor = hasNextPage ? (result[result.length - 1]?._id ?? null) : null;

    const data: MemberInfoDto[] = result.map(member => {
        const user = member.userId as any;
        return {
            userId: user?._id?.toString?.() ?? member.userId.toString(),
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
            memberRole: member.memberRole,
        };
    });

    return {
        data,
        meta:{
            nextCursor: nextCursor ? nextCursor.toString() : null,
            hasNextPage
        }
    };
}

// Tham gia cuộc group chat bằng link mời
export const joinConversationService = async (userId: string, conversationId: string) => {
    // Lấy thông tin của mình và thông tin cuộc trò chuyện song song
    const [currentUser, conversationInfo] = await Promise.all([
        findMyMemberInfo(conversationId, userId),
        getConversationInfo(conversationId)
    ]);
    if (!conversationInfo) {
        throw InternalServerException('Không tìm thấy thông tin cuộc trò chuyện');
    }

    // Nếu đang bị REMOVED -> Bỏ qua (không có quyền add lại)
    if (currentUser && currentUser.status === MemberStatus.REMOVED) {
        throw BadRequestException('Bạn đã bị loại khỏi cuộc trò chuyện này.');
    }

    // Nếu đang bị ACCEPTED -> Bỏ qua (không có quyền add lại)
    if (currentUser && currentUser.status === MemberStatus.ACCEPTED) {
        return;
    }

    const session = await startSession();
    session.startTransaction();
    try {
        const joinedAt = new Date();
        if (currentUser) {
            // Nếu nhóm là PRIVATE
            if (conversationInfo.privacy === ConversationPrivacy.PRIVATE) {
                // Nếu đang bị PENDING -> Bỏ qua
                if (currentUser.status === MemberStatus.PENDING) {
                    return;
                }
                // Nếu là LEFT -> Cho vào lại nhưng ở trạng thái PENDING (chờ duyệt)
                currentUser.status = MemberStatus.PENDING;
                currentUser.memberRole = MemberRole.MEMBER;
                await saveMember(currentUser, session);
            } else {
                // Nếu nhóm là PUBLIC -> Cho vào lại luôn ở trạng thái ACCEPTED
                currentUser.status = MemberStatus.ACCEPTED;
                currentUser.memberRole = MemberRole.MEMBER;
                currentUser.joinAt = joinedAt;
                await Promise.all([
                    saveMember(currentUser, session),
                    changeConversationMemberCount(conversationId, 1, session)
                ]);
            }
        } else {
            // Tạo mới thành viên mới nếu chưa từng có lịch sử nào trong nhóm
            if (conversationInfo.privacy === ConversationPrivacy.PRIVATE) {
                await addUserToConversation(conversationId, userId, MemberRole.MEMBER, MemberStatus.PENDING, joinedAt, session);
            } else {
                await Promise.all([
                    addUserToConversation(conversationId, userId, MemberRole.MEMBER, MemberStatus.ACCEPTED, joinedAt, session),
                    changeConversationMemberCount(conversationId, 1, session)
                ]);
            }
        }
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Không thể thêm thành viên vào cuộc trò chuyện.');
    } finally {
        await session.endSession();
    }
}
