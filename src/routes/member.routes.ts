import { Router, Express } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateDto } from '../middlewares/validate/validate.dto';
import { AddUserToConversationRequestDto } from '../dtos/request/member.dto';
import { addMemberToConversation } from '../controllers/member.controller';

const router = Router();

const memberRoutes = (app: Express) => {

    // Thêm thành viên mới vào cuộc trò chuyện
    router.post('/', authenticate, validateDto(AddUserToConversationRequestDto), addMemberToConversation);

    app.use('/members', router);
};

export default memberRoutes;