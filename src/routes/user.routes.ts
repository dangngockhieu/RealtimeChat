import { Router, Express } from 'express';
import {
  getAllUsers,
  getUserByEmail,
  getUserById,
  getProfile,
  changePassword,
  updateProfile,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../schemas/user.schema';
import { validateDto } from '../middlewares/validate/validate.dto';
import { ChangePasswordDto, UpdateUserDto } from '../dtos/request/user.dto';

const router = Router();

const userRoutes = (app: Express) => {

  // Lấy thông tin profile của chính mình
  router.get('/profile', authenticate, getProfile);

  // Đổi mật khẩu
  router.put('/change-password', authenticate, validateDto(ChangePasswordDto), changePassword);

  // Cập nhật profile
  router.put('/profile', authenticate, validateDto(UpdateUserDto), updateProfile);

  // ==================== ADMIN ONLY ====================

  // Lấy danh sách tất cả users (phân trang)
  router.get('/paginate', authenticate, authorize(Role.ADMIN), getAllUsers);

  // Tìm user theo email
  router.get('/search', authenticate, authorize(Role.ADMIN), getUserByEmail);

  // Lấy user theo ID
  router.get('/:id', authenticate, authorize(Role.ADMIN), getUserById);

  app.use('/users', router);
};

export default userRoutes;