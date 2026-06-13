import { ClientSession, Types } from "mongoose";
import { Member, IMember, MemberStatus, MemberRole } from "../schemas/member.schema";

export type MemberWithUser = Omit<IMember, 'userId'> & {
    userId: {
        _id?: Types.ObjectId;
        firstName: string;
        lastName: string;
    };
};

// Thông tin chi tiết (thời gian đọc tin cuối,...)
// của chính người dùng hiện tại (current user) trong cuộc trò chuyện
export const currentUserMemberInfo = async (conversationId: string, currentUserId: string) => {
    const member = await Member.findOne({ conversationId, userId: currentUserId })
            .select('lastReadAt')
            .lean()
            .exec();
    return member;
}

// Lấy Member role của user hiện tại trong group chat
export const getMyMemberRoleInGroupChat = async (token: string, userId: string): Promise<MemberRole | null> => {
    const member = await Member.findOne({ inviteCode: token, userId })
            .select('memberRole')
            .lean()
            .exec();
    return member ? member.memberRole : null;
}

// Tìm thành viên còn lại trong cuộc trò chuyện DIRECT
export const findMembersDirectByConversationId = async (userId: string, conversationId: string): Promise<MemberWithUser> => {
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

// Lấy tất cả các các conversationId mà user tham gia
export const findConversationIdsByUserId = async (userId: string): Promise<string[]> => {
    const memberships = await Member.find({ userId, status: MemberStatus.ACCEPTED }).select('conversationId').lean().exec();
    return memberships.map(m => m.conversationId.toString());
}

// Thêm mới người dùng vào cuộc trò chuyện
export const addUserToConversation = async (conversationId: string, userId: string, memberRole: MemberRole, status: MemberStatus, joinedAt: Date, session?: ClientSession) => {
    await Member.insertOne({
            conversationId: new Types.ObjectId(conversationId),
            userId: new Types.ObjectId(userId),
            memberRole: memberRole,
            status: status,
            joinAt: joinedAt
    }, { session });
}

// Lấy thông tin của mình trong cuộc trò chuyện
export const findMyMemberInfo = async (conversationId: string, userId: string): Promise<MemberWithUser> => {
    const member = await Member.findOne({ conversationId, userId })
            .populate('userId', 'role')
            .lean()
            .exec();
    return member as unknown as MemberWithUser;
}

// Lấy thông tin của mình trong cuộc trò chuyện với token
export const findMyMemberInfoưithToken = async (token: string, userId: string): Promise<MemberWithUser> => {
    const member = await Member.findOne({ inviteCode: token, userId })
            .populate('userId', 'role')
            .lean()
            .exec();
    return member as unknown as MemberWithUser;
}

// Lấy thông tin của tất cả thành viên xem có ở trong cuộc trò chuyện hay ko
export const checkMembersByConversationId = async (conversationId: string, userIds: string[],session?: ClientSession): Promise<MemberWithUser[]> => {
    const members = await Member.find({
        conversationId,
        userId: { $in: userIds }
    }, null, { session })
        .populate('userId', 'firstName lastName')
        .lean()
        .exec();
    return members as unknown as MemberWithUser[];
}

export const createMember = async (
    member: Pick<IMember, 'memberRole' | 'status' | 'joinAt'> & {
        conversationId: IMember['conversationId'] | string;
        userId: IMember['userId'] | string;
    },
    session?: ClientSession
) => {
    const newMember = new Member(member);
    return await newMember.save({ session });
};

// Cập nhật thông tin thành viên
export const saveMember = async (member: IMember | MemberWithUser, session?: ClientSession) => {
    return await Member.findByIdAndUpdate(
        member._id,
        member,
        { session, returnDocument: 'after' }
    ).exec();
};

// Lấy tất cả thành viên của group chat
export const getMembersByConversationId = async (limit: number, filter: any): Promise<MemberWithUser[]> => {
    const members = await Member
        .find(filter)
        .populate('userId', 'firstName lastName')
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean()
        .exec();
    return members as unknown as MemberWithUser[];
}

// Thay đổi quyền của user trong nhóm chat
export const changeRoleInConversation = async (
    conversationId: string, 
    memberId: string, 
    newRole: MemberRole,
    session?: ClientSession
) => {
    return await Member.updateOne(
        { conversationId, _id: memberId },
        { memberRole: newRole },
        { session }
    ).exec();
};