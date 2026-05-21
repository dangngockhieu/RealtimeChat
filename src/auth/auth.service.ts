import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../modules/user/user.service';
import * as argon from "argon2";
import { UserLogin } from '../response';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterRequestDto } from './dto/auth.request.dto';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwt: JwtService,
        private config: ConfigService,
    ) {}

    private hashToken512(token: string): string {
        return createHash('sha512').update(token).digest('hex');
    }

    private async createAccessToken(id: string, email: string, role: string): Promise<string> {
        const payload = { sub: id, email, role };
        const accessToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_SECRET'),
            expiresIn: this.config.get<string>('JWT_EXPIRED') as any,
        });
        return accessToken;
    }

    private async createRefreshToken(id: string, email: string): Promise<string> {
        const payload = { sub: id, email };
        const refreshToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get<string>('REFRESH_EXPIRED') as any,
        });
        return refreshToken;
    }

    private async validateRefreshToken(token: string) {
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });

            if (!payload) return null;

            const user = await this.userService.getUserWithRefreshTokenById(payload.sub);
            if (!user || !user.refreshToken) return null;

            const hashedToken = this.hashToken512(token);

            if (user.refreshToken !== hashedToken) return null;

            return payload;
        } catch {
            console.error('Error occurred while validating refresh token');
            return null;
        }
    }

    async validateUser(email: string, password: string): Promise<UserLogin> {
        const user = await this.userService.getUserByEmailWithPassword(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (!user.isActive){
            throw new ForbiddenException('Tài khoản chưa đuợc kích hoạt');
        }
        const isMatch = await argon.verify(user.password, password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid email or password');
        }
        const { id, email: userEmail, firstName, lastName, role } = user;
        return { id, email: userEmail, firstName, lastName, role };
    }

    async register(dto: RegisterRequestDto): Promise<void> {
        const existingUser = await this.userService.getUserByEmail(dto.email).catch(() => null);
        if (existingUser) {
            throw new ForbiddenException('Email đã được sử dụng');
        }
        await this.userService.createUser(dto.email, dto.password, dto.firstName, dto.lastName);
    }

    async login(user: UserLogin): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = await this.createAccessToken(user.id, user.email, user.role);
        const refreshToken = await this.createRefreshToken(user.id, user.email);
        const hashedRefreshToken = this.hashToken512(refreshToken);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);
        return {
            accessToken,
            refreshToken
        };
    }

    async logout(id: string): Promise<void> {
        await this.userService.updateRefreshToken(id, null);
    }

async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.validateRefreshToken(refreshToken);

    if (!payload) {
        throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.userService.getUserWithRefreshTokenById(payload.sub);
    if (!user) {
        throw new NotFoundException('User not found');
    }

    const accessToken = await this.createAccessToken(user.id, user.email, user.role);
    const newRefreshToken = await this.createRefreshToken(user.id, user.email);
    const hashedNewRefreshToken = this.hashToken512(newRefreshToken);

    await this.userService.updateRefreshToken(user.id, hashedNewRefreshToken);

    return {
        accessToken,
        refreshToken: newRefreshToken
    };
}
}