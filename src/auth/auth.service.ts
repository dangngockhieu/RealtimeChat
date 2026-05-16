import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as argon from "argon2";
import { UserLogin } from './dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterRequestDto } from './dto/auth.request.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private userService: UserService,
        private jwt: JwtService,
        private config: ConfigService,
    ) {}

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

    private async createAccessToken(user: UserLogin){
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_SECRET'),
            expiresIn: this.config.get<string>('JWT_EXPIRED') as any,
        });
        return accessToken;
    }

    private async createRefreshToken(user: UserLogin) {
        const payload = { sub: user.id, email: user.email};
        const refreshToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get<string>('REFRESH_EXPIRED') as any,
        });
        return refreshToken;
    }

    private async verifyRefreshToken(token: string) {
        try {
            return await this.jwt.verifyAsync(token, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch (error) {
            return null;
        }
    }

    async login(user: UserLogin) {
        const accessToken = await this.createAccessToken(user);
        const refreshToken = await this.createRefreshToken(user);
        return {
            accessToken,
            refreshToken
        };
    }

    async register(dto: RegisterRequestDto) {
        const existingUser = await this.userService.getUserByEmail(dto.email).catch(() => null);
        if (existingUser) {
            throw new ForbiddenException('Email đã được sử dụng');
        }
        await this.userModel.create({
            email: dto.email,
            password: await argon.hash(dto.password),
            firstName: dto.firstName,
            lastName: dto.lastName
        });
    }
}