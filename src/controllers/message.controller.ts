import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import { createMessageService } from '../services/message.service';
import { CreateMessageDto } from '../dtos/request/message.dto';

// Tạo tin nhắn mới
export const createMessage = async (req: Request, res: Response) => {
  const user = req.user as UserAccount;
  const conversationId = req.params.conversationId as string;
  const dto = req.body as CreateMessageDto;
  await createMessageService(conversationId, user.id, dto);
  res.customSuccess(null, 'Tin nhắn đã được gửi');
};