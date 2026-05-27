import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import { CreateDirectChatDto, CreateGroupChatDto } from '../dtos/request/conversation.dto';
import { createGroupChatService, findOrCreateDirectChatService, getMyConversationsService } from '../services/conversation.service';

// Tạo nhóm chat mới
export const createGroupChat = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const body = req.body as CreateGroupChatDto;
    const conversation = await createGroupChatService(user.id, body);
    res.customSuccess(conversation, 'Tạo nhóm chat thành công');
};

// Tìm hoặc tạo cuộc trò chuyện trực tiếp giữa 2 người
export const findOrCreateDirectChat = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const body = req.body as CreateDirectChatDto;
    const conversation = await findOrCreateDirectChatService(user.id, body.targetUserId);
    res.customSuccess(conversation, 'Tìm hoặc tạo chat trực tiếp thành công');
};

export const getMyConversations = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { limit, cursor } = req.query as { limit?: string, cursor?: string };
    const result = await getMyConversationsService(user.id, limit ? parseInt(limit) : 20, cursor);
    res.customSuccess(result, 'Lấy danh sách cuộc trò chuyện thành công');
}