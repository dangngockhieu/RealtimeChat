import {createHash} from 'crypto';
import * as argon from 'argon2';
import jwt from 'jsonwebtoken';
import { getUserByEmailWithPassword, createUser, updateRefreshToken as updateRefreshTokenService, getUserWithRefreshTokenById } from './user.service';
import { ForbiddenException, NotFoundException, UnauthorizedException, BadRequestException } from '../middlewares/formatResponse/exception/customException';
import { UserLogin } from '../dtos/response/auth.interface';

const hashToken512 = (token: string): string => {
    return createHash('sha512').update(token).digest('hex');
}

const createAccessToken = (id: string, email: string, role: string): string => {
    const payload = { id, email, role };
    return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
        expiresIn: (process.env.JWT_EXPIRED || '15m') as any,
    });
};

const createRefreshToken = (id: string, email: string): string => {
    const payload = { id, email };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret', {
        expiresIn: (process.env.REFRESH_EXPIRED || '7d') as any,
    });
};

const validateRefreshToken = async (token: string) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret') as any;

        if (!payload) return null;

        const user = await getUserWithRefreshTokenById(payload.id);
        if (!user || !user.refreshToken) return null;

        const hashedToken = hashToken512(token);

        if (user.refreshToken !== hashedToken) return null;

        return payload;
    } catch {
        return null;
    }
};

export const validateUser = async (email: string, password: string): Promise<UserLogin> => {
    const user = await getUserByEmailWithPassword(email);
    if (!user) {
        throw NotFoundException('User not found');
    }
    if (!user.isActive){
        throw ForbiddenException('Tài khoản chưa đuợc kích hoạt');
    }
    const isMatch = await argon.verify(user.password, password);
    if (!isMatch) {
        throw UnauthorizedException('Invalid email or password');
    }
    const { _id, email: userEmail, firstName, lastName, role } = user;
    return { id: _id.toString(), email: userEmail, firstName, lastName, role };
}

export const registerUser = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    const existingUser = await getUserByEmailWithPassword(email).catch(() => null);
    if (existingUser) {
        throw ForbiddenException('Email đã được sử dụng');
    }
    await createUser(email, password, firstName, lastName);
}

export const loginUser = async (user: UserLogin): Promise<{ accessToken: string; refreshToken: string }> => {
    const accessToken = createAccessToken(user.id, user.email, user.role);
    const refreshToken = createRefreshToken(user.id, user.email);
    const hashedRefreshToken = hashToken512(refreshToken);

    await updateRefreshTokenService(user.id, hashedRefreshToken);

    return {
        accessToken,
        refreshToken
    };
};

export const logoutUser = async (id: string): Promise<void> => {
    await updateRefreshTokenService(id, null);
};

export const refreshTokensService = async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const payload = await validateRefreshToken(refreshToken);

    if (!payload) {
        throw ForbiddenException('Invalid refresh token');
    }

    const user = await getUserWithRefreshTokenById(payload.id);
    if (!user) {
        throw NotFoundException('User not found');
    }

    const accessToken = createAccessToken(user._id.toString(), user.email, user.role);
    const newRefreshToken = createRefreshToken(user._id.toString(), user.email);
    const hashedNewRefreshToken = hashToken512(newRefreshToken);

    await updateRefreshTokenService(user._id.toString(), hashedNewRefreshToken);

    return {
        accessToken,
        refreshToken: newRefreshToken
    };
};