import { IMessage, Message } from "../schemas/message.schema";

export const countMessagesUnRead = async (conversationId: string, currentUserId: string, lastReadAt: Date | null) => {
    const unreadCount = await Message.countDocuments({
        conversationId,
        createdAt: { $gt: lastReadAt },
        senderId: { $ne: currentUserId }, // Logic chuẩn: Tin của mình gửi thì không tính là chưa đọc
        isRecalled: false
    });
    return unreadCount;
}

// Tạo tin nhắn mới
export const createMessageRepository = async (conversationId: string, senderId: string, content: string, replyTo?: string) => {
    const newMessage = new Message({
        conversationId,
        senderId,
        content,
        replyTo: replyTo || null,
        isRecalled: false,
    });
    await newMessage.save();
}

// Tìm tin nhắn theo ID
export const findMessageById = async (messageId: string) => {
    return await Message.findById(messageId);
}

// Save message
export const saveMessage = async (message: IMessage) => {
    await message.save();
}