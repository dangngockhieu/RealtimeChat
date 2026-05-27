import { ClientSession, Types } from "mongoose";
import { CreateGroupChatDto } from "../dtos/request/conversation.dto";
import { Conversation, ConversationPrivacy, ConversationType } from "../schemas/conversation.schema";
import { Member } from "../schemas/member.schema";

// Tìm kiếm cuộc trò chuyện theo ID
export const findConversationById = async (conversationId: string) => {
    return await Conversation.findById(conversationId).exec();
}

// Tạo nhóm mới
export const createConversation = async (dto: CreateGroupChatDto, session?: ClientSession) => {
    const [conversation] = await Conversation.create(
        [{
            type: ConversationType.GROUP,
            privacy: dto.privacy,
            name: dto.name,
            memberCount: dto.participantIds.length + 1,
        }],
        { session }
    );
    return conversation;
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
    }).exec();
}

// Tạo cuộc trò chuyện giữa 2 người dùng
export const createDirectConversation = async (session?: ClientSession) => {
    const [conversation] = await Conversation.create(
        [{
            type: ConversationType.DIRECT,
            privacy: ConversationPrivacy.PRIVATE,
            memberCount: 2,
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
    .lean();
}

// Thay đổi privacy của cuộc trò chuyện
export const changeConversationPrivacy = async (conversationId: string, privacy: ConversationPrivacy) => {
    await Conversation.findByIdAndUpdate(conversationId, { privacy }, { new: true }).exec();
}