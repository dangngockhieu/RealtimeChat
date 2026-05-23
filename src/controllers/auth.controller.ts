import { Request, Response } from 'express';
import { registerUser, loginUser, logoutUser, refreshTokensService } from '../services/auth.service';
import { BadRequestException } from '../middlewares/formatResponse/exception/customException';
import { UserAccount, UserLogin } from '../dtos/response/auth.interface';

export const register = async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;
    await registerUser(email, password, firstName, lastName);
    res.customSuccess(null, 'Đăng ký thành công');
};

export const login = async (req: Request, res: Response) => {
    const user = req.user as UserLogin;

    if (!user) {
        throw BadRequestException('Không nhận được thông tin user');
    }

    const data = await loginUser(user);
    const isProd = process.env.NODE_ENV === 'production';

    if (req.cookies?.refreshToken) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
            domain: isProd ? '.yourdomain.com' : undefined // Replace origin domain
        });
    }

    res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax', // Tương tự origin logic
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: isProd ? '.yourdomain.com' : undefined // Replace origin domain
    });

    res.customSuccess(
        { accessToken: data.accessToken, user: user },
        'Đăng nhập thành công'
    );
};

export const logout = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;

    if (user && user.id) {
        await logoutUser(user.id);
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (req.cookies?.refreshToken) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
            domain: isProd ? '.yourdomain.com' : undefined
        });
    }

    res.customSuccess(null, 'Đăng xuất thành công');
};

export const refreshTokens = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        throw BadRequestException('Refresh token not found');
    }

    const data = await refreshTokensService(refreshToken);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: isProd ? '.yourdomain.com' : undefined
    });

    res.customSuccess(
        { accessToken: data.accessToken },
        'Làm mới token thành công'
    );
};