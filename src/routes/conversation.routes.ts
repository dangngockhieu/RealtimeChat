import { Router, Express } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateDto } from '../middlewares/validate/validate.dto';
import { changeConversationPrivacy, changeConversationTypeCommunity, createGroupChat, findOrCreateDirectChat, getConversationName, getLinkJoinGroup, getMyConversations } from '../controllers/conversation.controller';
import { ChangeConversationPrivacyDto, CreateDirectChatDto, CreateGroupChatDto } from '../dtos/request/conversation.dto';

const router = Router();

const conversationRoutes = (app: Express) => {

    // Tạo nhóm chat mới
    router.post('/groups', authenticate, validateDto(CreateGroupChatDto), createGroupChat);

    // Tìm hoặc tạo cuộc trò chuyện trực tiếp giữa 2 người
    router.post('/direct', authenticate, validateDto(CreateDirectChatDto), findOrCreateDirectChat);

    // Lấy danh sách cuộc trò chuyện của tôi
    router.get('/', authenticate, getMyConversations);

    // Lấy link mời tham gia cuộc trò chuyện
    router.get('/link-join/:token', authenticate, getLinkJoinGroup)

    // Lấy tên của nhóm chat
    router.get('/name/:token', authenticate, getConversationName);

    // Thay đổi privacy của cuộc trò chuyện
    router.patch('/:id/privacy', authenticate, validateDto(ChangeConversationPrivacyDto), changeConversationPrivacy);

    // Đổi từ nhóm chat sang cộng đồng
    router.patch('/:id/type', authenticate, changeConversationTypeCommunity);

    app.use('/conversations', router);
};

export default conversationRoutes;

