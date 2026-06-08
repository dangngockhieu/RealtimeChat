import { Router, Express } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateDto } from '../middlewares/validate/validate.dto';
import { AddUserToConversationRequestDto, TargetUserIdRequestDto } from '../dtos/request/member.dto';
import { acceptInvitation, addMemberToConversation, getMembersByConversationId, joinConversationByToken, leftConversation, removeUserFromConversation } from '../controllers/member.controller';

const router = Router();

const memberRoutes = (app: Express) => {

    // Thêm thành viên mới vào cuộc trò chuyện
    router.post('/', authenticate, validateDto(AddUserToConversationRequestDto), addMemberToConversation);

    // Rời khỏi cuộc trò chuyện
    router.patch('/:conversationId/leave', authenticate, leftConversation);

    // Xóa thành viên khỏi cuộc trò chuyện (chỉ quản trị viên mới có quyền này)
    router.patch('/:conversationId/remove', authenticate, validateDto(TargetUserIdRequestDto), removeUserFromConversation);

    // Chấp nhận lời mời vào cuộc trò chuyện (chỉ quản trị viên mới có quyền này)
    router.patch('/:conversationId/accept', authenticate, validateDto(TargetUserIdRequestDto), acceptInvitation);

    // Lấy danh sách thành viên của cuộc trò chuyện
    router.get('/:conversationId', authenticate, getMembersByConversationId);

    // Tham gia cuộc trò chuyện bằng token
    router.post('/join/:conversationId', authenticate, joinConversationByToken);

    app.use('/members', router);
};

export default memberRoutes;