import { ClientSession } from "mongoose";
import { Member, IMember, MemberStatus } from "../schemas/member.schema";
import { IUser } from "../schemas/user.schema";

export type MemberWithUser = Omit<IMember, 'userId'> & {
    user: IUser;
};

// Thông tin chi tiết (vai trò, trạng thái, thời gian đọc tin cuối,...)
// của chính người dùng hiện tại (current user) trong cuộc trò chuyện
export const currentUserMemberInfo = async (conversationId: string, currentUserId: string) => {
    const member = await Member.findOne({ conversationId, userId: currentUserId })
                .lean()
                .exec();
    return member;
}

// Tìm thành viên còn lại trong cuộc trò chuyện DIRECT
export const findMembersByConversationId = async (userId: string, conversationId: string): Promise<MemberWithUser> => {
    const members = await Member.findOne({
            conversationId,
            userId: { $ne: userId },
        })
            .populate('userId', 'firstName lastName')
            .exec();
    return members as unknown as MemberWithUser;
}

// Insert nhiều thành viên vào cuộc trò chuyện (dùng khi tạo nhóm mới)
export const insertManyUserToConversation = async (
    conversationId: string, creatorId: string, participantIds: string[], session?: ClientSession
) => {
    const joinedAt = new Date();
    await Member.insertMany([
        {
            conversationId: conversationId,
            userId: creatorId,
            role: 'OWNER',
            status: 'ACCEPTED',
            joinAt: joinedAt
        },
        ...participantIds.map(id => ({
            conversationId: conversationId,
            userId: id,
            role: 'MEMBER',
            status: 'ACCEPTED',
            joinAt: joinedAt
        }))
    ], { session });
}

// Insert member của cuộc trò chuyện trực tiếp giữa 2 người
export const insertDirectChatMembers = async (
    conversationId: string, userId1: string, userId2: string, session?: ClientSession
) => {
    const joinedAt = new Date();
    await Member.insertMany([
        {
            conversationId: conversationId,
            userId: userId1,
            role: 'MEMBER',
            status: 'ACCEPTED',
            joinAt: joinedAt
        },
        {
            conversationId: conversationId,
            userId: userId2,
            role: 'MEMBER',
            status: 'ACCEPTED',
            joinAt: joinedAt
        }
    ], { session });
}

// Tìm các thành viên của cuộc trò chuyện theo danh sách userId
export const findMembersWithUserDetails = async (
    conversationId: string,
    allUserIds: string[]
): Promise<MemberWithUser[]> =>{
    const members = await Member
            .find({ conversationId: conversationId, userId: { $in: allUserIds } })
            .populate('userId', 'firstName lastName role')
            .exec();
    return members as unknown as MemberWithUser[];
}

// Lấy tất cả các các conversationId mà user tham gia
export const findConversationIdsByUserId = async (userId: string): Promise<string[]> => {
    const memberships = await Member.find({ userId, status: MemberStatus.ACCEPTED }).select('conversationId').lean().exec();
    return memberships.map(m => m.conversationId.toString());
}

// Thêm mới người dùng vào cuộc trò chuyện
export const addUserToConversation = async (userId: string,conversationId: string, userIds: string[]) => {
}