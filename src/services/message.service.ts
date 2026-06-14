import { CreateMessageDto } from "../dtos/request/message.dto";
import { ForbiddenException, NotFoundException } from "../middlewares/formatResponse/exception/customException";
import { createMessageRepository, findMessageById, saveMessage } from "../repositories/message.repository";

// Tạo tin nhắn mới
export const createMessageService = async (conversationId: string, senderId: string, dto: CreateMessageDto): Promise<void> => {
    await createMessageRepository(conversationId, senderId, dto.content, dto.replyTo);
}

// Thu hồi tin nhắn
export const recallMessageService = async (messageId: string, senderId: string): Promise<void> => {
    const message = await findMessageById(messageId);
    if (!message) {
        throw NotFoundException('Tin nhắn không tồn tại');
    }
    if (message.senderId.toString() !== senderId) {
        throw ForbiddenException('Bạn không có quyền thu hồi tin nhắn này');
    }
    message.isRecalled = true;
    message.recallAt = new Date();
    await saveMessage(message);
}