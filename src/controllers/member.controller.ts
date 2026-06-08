import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import { AddUserToConversationRequestDto, TargetUserIdRequestDto } from '../dtos/request/member.dto';
import { acceptInvitationService, addUserToConversationService, getMembersInfoByConversationIdService, joinConversationService, leftConversationService, removeUserFromConversationService } from '../services/member.service';

export const addMemberToConversation = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const body = req.body as AddUserToConversationRequestDto;
    await addUserToConversationService(user.id, body.conversationId, body.userIds);
    res.customSuccess(null, 'Thêm thành viên vào cuộc trò chuyện thành công');
}

export const leftConversation = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const conversationId = req.params.conversationId as string;
    await leftConversationService(user.id, conversationId);
    res.customSuccess(null, 'Rời khỏi cuộc trò chuyện thành công');
}

export const removeUserFromConversation = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const conversationId = req.params.conversationId as string;
    const body = req.body as TargetUserIdRequestDto;
    await removeUserFromConversationService(user.id, body.targertUserId, conversationId);
    res.customSuccess(null, 'Xóa thành viên khỏi cuộc trò chuyện thành công');
}

export const acceptInvitation = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const conversationId = req.params.conversationId as string;
    const body = req.body as TargetUserIdRequestDto;
    await acceptInvitationService(user.id, body.targertUserId, conversationId);
    res.customSuccess(null, 'Chấp nhận lời mời vào cuộc trò chuyện thành công');
}

export const getMembersByConversationId = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const conversationId = req.params.conversationId as string;
    const { limit, cursor } = req.query as { limit?: string, cursor?: string };
    const result = await getMembersInfoByConversationIdService(user.id, conversationId, limit ? parseInt(limit) : 20, cursor);
    res.customSuccess(result, 'Lấy danh sách cuộc trò chuyện thành công');
}

export const joinConversationByToken = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const conversationId = req.params.conversationId as string;
    await joinConversationService(user.id, conversationId);
    res.customSuccess(null, 'Tham gia cuộc trò chuyện thành công');
}