import { Router, Express } from 'express';
import { authenticate} from '../middlewares/auth';
import { validateDto } from '../middlewares/validate/validate.dto';
import {
  acceptFriendship,
  blockFriendship,
    createFriendship,
    declineFriendship,
    deleteFriendship,
    getBlockedUsers,
    getFriendships,
    getPendingFriendships,
    removeSendFriendship,
    unBlockFriendship,
} from '../controllers/friendship.controller';
import { FriendRequestDto } from '../dtos/request/friendship.dto';

const router = Router();

const friendshipRoutes = (app: Express) => {

  // Lấy danh sách bạn bè của người dùng hiện tại
  router.get('/', authenticate, getFriendships);

  // Lấy danh sách lời mời kết bạn đang chờ
  router.get('/pending', authenticate, getPendingFriendships);

  // Lấy danh sách người dùng bị chặn
  router.get('/blocked', authenticate, getBlockedUsers);

  // Tạo lời mời kết bạn mới
  router.post('/', authenticate, validateDto(FriendRequestDto), createFriendship);

  // Chặn người dùng
  router.post('/block', authenticate, validateDto(FriendRequestDto), blockFriendship);

  // Bỏ chặn người dùng
  router.delete('/unblock/:friendId', authenticate, unBlockFriendship);

  // Hủy lời mời kết bạn đã gửi
  router.delete('/:id/remove_send', authenticate, removeSendFriendship);

  // Xóa bạn bè
  router.delete('/:id/remove', authenticate, deleteFriendship);

  // Accept lời mời kết bạn
  router.patch('/:id/accept', authenticate, acceptFriendship);

  router.patch('/:id/decline', authenticate, declineFriendship);

  app.use('/users', router);
};

export default friendshipRoutes;