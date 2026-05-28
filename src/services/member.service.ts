import { startSession } from "mongoose";
import { BadRequestException, ConflictException, InternalServerException } from "../middlewares/formatResponse/exception/customException";
import {
    getConversationInfo,
    incrementConversationMemberCount
} from "../repositories/conversation.repository";
import {
    addUserToConversation,
    createMember,
    findMembersInfoByConversationId,
    findMyMemberInfo,
    saveMember
} from "../repositories/member.repository";
import { MemberRole, MemberStatus } from "../schemas/member.schema";
import { ConversationPrivacy } from "../schemas/conversation.schema";

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
        const existingMembers = await findMembersInfoByConversationId(conversationId, userIds, session);

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
                if (currentUser.role !== MemberRole.MEMBER) {
                    existingMember.status = MemberStatus.ACCEPTED;
                    existingMember.role = MemberRole.MEMBER;
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
                        existingMember.role = MemberRole.MEMBER;
                        await saveMember(existingMember, session);
                    } else {
                        // Nếu nhóm là PUBLIC -> Cho vào lại luôn ở trạng thái ACCEPTED
                        existingMember.status = MemberStatus.ACCEPTED;
                        existingMember.role = MemberRole.MEMBER;
                        existingMember.joinAt = joinedAt;
                        await saveMember(existingMember, session);
                        addedCount++;
                    }
                }
            } else {
                // Tạo mới thành viên mới nếu chưa từng có lịch sử nào trong nhóm
                if (conversationInfo.privacy === ConversationPrivacy.PRIVATE && currentUser.role === MemberRole.MEMBER) {
                    await addUserToConversation(conversationId, targetUserId, MemberRole.MEMBER, MemberStatus.PENDING, session);
                } else {
                    await addUserToConversation(conversationId, targetUserId, MemberRole.MEMBER, MemberStatus.ACCEPTED, session);
                    addedCount++;
                }
            }
        }

        // Nếu không có ai được add (do tất cả mọi người được chọn đều ĐÃ CÓ trong nhóm)
        if (addedCount === 0) {
            throw ConflictException('Tất cả người dùng được chọn đã ở trong nhóm.');
        }

        //Cập nhật lại tổng số lượng thành viên
        await incrementConversationMemberCount(conversationId, addedCount, session);

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw InternalServerException('Không thể thêm thành viên vào cuộc trò chuyện.');
    } finally {
        await session.endSession();
    }
}