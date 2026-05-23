import { Router, Express } from 'express';
import { register, login, logout, refreshTokens } from '../controllers/auth.controller';
import { authenticate, authenticateLocal } from '../middlewares/auth';

const router = Router();

const authRoutes = (app: Express) => {

    // Đăng ký tài khoản mới
    router.post('/register', register);

    // Đăng nhập bằng email + password (passport-local xác thực)
    router.post('/login', authenticateLocal, login);

    // Đăng xuất (yêu cầu JWT hợp lệ)
    router.post('/logout', authenticate, logout);

    // Làm mới access token bằng refresh token (từ cookie)
    router.post('/refresh', refreshTokens);

    app.use('/auth', router);
};

export default authRoutes;

