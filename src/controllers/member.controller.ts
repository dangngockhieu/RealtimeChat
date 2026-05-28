import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import { AddUserToConversationRequestDto } from '../dtos/request/member.dto';
import { addUserToConversationService } from '../services/member.service';

export const addMemberToConversation = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const body = req.body as AddUserToConversationRequestDto;
    await addUserToConversationService(user.id, body.conversationId, body.userIds);
    res.customSuccess(null, 'Thêm thành viên vào cuộc trò chuyện thành công');
}