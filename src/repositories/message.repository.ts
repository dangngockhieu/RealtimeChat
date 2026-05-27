import { Message } from "../schemas/message.schema";

export const countMessagesUnRead = async (conversationId: string, currentUserId: string, lastReadAt: Date | null): Promise<number> => {
    const unreadCount = await Message.countDocuments({
        conversationId,
        createdAt: { $gt: lastReadAt },
        senderId: { $ne: currentUserId }, // Logic chuẩn: Tin của mình gửi thì không tính là chưa đọc
        isRecalled: false
    });
    return unreadCount;
}