import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import { ChangeConversationPrivacyDto, CreateDirectChatDto, CreateGroupChatDto } from '../dtos/request/conversation.dto';
import { changeConversationPrivacyService, createGroupChatService, findOrCreateDirectChatService, getConversationNameService, getInviteLinkService, getMyConversationsService } from '../services/conversation.service';

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

// Lấy danh sách cuộc trò chuyện của người dùng
export const getMyConversations = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { limit, cursor } = req.query as { limit?: string, cursor?: string };
    const result = await getMyConversationsService(user.id, limit ? parseInt(limit) : 20, cursor);
    res.customSuccess(result, 'Lấy danh sách cuộc trò chuyện thành công');
}

// Thay đổi privacy của cuộc trò chuyện
export const changeConversationPrivacy = async (req: Request, res: Response) => {
    const conversationId  = req.params.id as string;
    const user = req.user as UserAccount;
    const { privacy } = req.body as ChangeConversationPrivacyDto;

    await changeConversationPrivacyService(user.id, conversationId, privacy);
    res.customSuccess(null, 'Thay đổi privacy của cuộc trò chuyện thành công');
};

// Lấy link mời tham gia nhóm
export const getLinkJoinGroup = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const token = req.params.token as string;
    const result = await getInviteLinkService(user.id, token);
    res.customSuccess(result, "Lấy link tham gia nhóm thành công")
}

// Lấy tên của nhóm chat
export const getConversationName = async (req: Request, res: Response) => {
    const token = req.params.token as string;
    const result = await getConversationNameService(token);
    res.customSuccess(result, "Lấy tên nhóm chat thành công");
}
