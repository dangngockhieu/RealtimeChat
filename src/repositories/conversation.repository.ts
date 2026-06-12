import { ClientSession, Types } from "mongoose";
import { CreateGroupChatDto } from "../dtos/request/conversation.dto";
import { Conversation, ConversationPrivacy, ConversationType } from "../schemas/conversation.schema";
import { Member } from "../schemas/member.schema";

// Tìm kiếm cuộc trò chuyện theo token link mời
export const getConversationByInviteCode = async (inviteCode: string) => {
    return await Conversation
    .findOne({ inviteCode })
    .select('name')
    .lean()
    .exec();
}

// Tạo nhóm mới
export const createConversation = async (dto: CreateGroupChatDto, inviteCode: string, session?: ClientSession) => {
    const lastMessageAt = new Date();
    while (true) {
        try {
            const [conversation] = await Conversation.create(
                [
                    {
                        type: ConversationType.GROUP,
                        privacy: dto.privacy,
                        name: dto.name,
                        inviteCode: inviteCode,
                        memberCount: dto.participantIds.length + 1,
                        lastMessageAt,
                    },
                ],
                { session },
            );
            return conversation;
        } catch (err: any) {
            // duplicate inviteCode
            if (err?.code === 11000) {
                continue;
            }
            throw err;
        }
    }
}

// Tìm cuộc trò chuyện trực tiếp giữa hai người dùng
export const findDirectConversation = async (userId1: string, userId2: string)=> {
    const results = await Member.aggregate([
        { $match: { userId: { $in: [new Types.ObjectId(userId1), new Types.ObjectId(userId2)] } } },
        { $group: { _id: "$conversationId", count: { $sum: 1 } } },
        { $match: { count: 2 } }
    ]);

    if (!results.length) return null;

    return await Conversation.findOne({
        _id: { $in: results.map(r => r._id) },
        type: ConversationType.DIRECT
    })
    .select('privacy type memberCount')
    .lean()
    .exec();
}

// Tạo cuộc trò chuyện giữa 2 người dùng
export const createDirectConversation = async (session?: ClientSession) => {
    const lastMessageAt = new Date();
    const [conversation] = await Conversation.create(
        [{
            type: ConversationType.DIRECT,
            privacy: ConversationPrivacy.PRIVATE,
            memberCount: 2,
            lastMessageAt,
        }],
        { session }
    );
    return conversation;
}

// Lấy danh sách các conversation của người dùng
export const findConversationsByUserId = async (limit: number, filter: any) => {
    return await Conversation
    .find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(limit + 1)
    .lean()
    .exec();
}

// Thay đổi privacy của cuộc trò chuyện
export const changeConversationPrivacy = async (conversationId: string, privacy: ConversationPrivacy) => {
    await Conversation.findByIdAndUpdate(
        conversationId,
        { privacy },
        { returnDocument: 'after' }
    ).exec();
}

// Thay đổi type của cuộc trò chuyện
export const changeConversationType = async (conversationId: string, type: ConversationType) => {
    await Conversation.findByIdAndUpdate(
        conversationId,
        { type },
        { returnDocument: 'after' }
    ).exec();
}

// Lấy thông tin cuộc trò chuyện
export const getConversationInfo = async (conversationId: string) => {
    return await Conversation.findById(conversationId)
            .select('privacy')
            .lean()
            .exec();
}

// Thay đổi số lượng member
export const changeConversationMemberCount = async (conversationId: string, incrementBy: number, session?: ClientSession) => {
    await Conversation.findByIdAndUpdate(
        conversationId,
        { $inc: { memberCount: incrementBy } },
        { session }
    ).exec();
};

// Thay đổi inviteCode của cuộc trò chuyện
export const changeConversationInviteCode = async (conversationId: string, inviteCode: string) => {
    await Conversation.findByIdAndUpdate(
        conversationId,
        { inviteCode }
    ).exec();
};
