import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangePasswordDto, UpdateUserDto} from './dto/user.request.dto';
import * as argon from "argon2";
import aqp from 'api-query-params';
import { plainToInstance } from 'class-transformer';
import { PaginateResponse, UserResponseDto, UserValidatorDto, UserWithRefreshTokenDto } from '../../response';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    // Đổi mật khẩu cho người dùng
    async updatePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
        if(dto.newPassword !== dto.confirmPassword) {
            throw new BadRequestException('New password and confirm password do not match');
        }
        const user = await this.userRepository.findByIdWithPassword(userId);
        if(!user) {
            throw new NotFoundException('User not found');
        }
        const isMatch = await argon.verify(user.password, dto.oldPassword);
        if(!isMatch) {
            throw new ForbiddenException('Old password is incorrect');
        }
        const hashedPassword = await argon.hash(dto.newPassword);
        await this.userRepository.updatePassword(userId, hashedPassword);
    }

    // Cập nhật thông tin cá nhân của người dùng
    async updateUserProfile(userId: string, dto:UpdateUserDto): Promise<UserResponseDto> {
        const updatedUser = await this.userRepository.updateProfile(userId, dto);

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
        }

        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy thông tin người dùng theo ID
    async getUserById(userId: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy thông tin người dùng theo ID, bao gồm refreshToken (dành cho xác thực)
    async getUserWithRefreshTokenById(userId: string): Promise<UserWithRefreshTokenDto> {
        const user = await this.userRepository.findByIdWithRefreshToken(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserWithRefreshTokenDto, user, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy thông tin người dùng theo email
    async getUserByEmail(email: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy thông tin người dùng theo email, bao gồm mật khẩu (dành cho xác thực)
    async getUserByEmailWithPassword(email: string): Promise<UserValidatorDto> {
        const user = await this.userRepository.findByEmailWithPassword(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserValidatorDto, user, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy danh sách người dùng với phân trang và lọc
    async getAllUsesrs(page: number = 1, limit: number = 10, query: string): Promise<PaginateResponse<UserResponseDto>> {
        const skip = (page - 1) * limit;
        const { filter, sort, projection, population } = aqp(query);
        delete filter.page;
        delete filter.limit;

        const [users, totalItems] = await Promise.all([
            this.userRepository.findAll(filter, sort, projection, population, skip, limit),
            this.userRepository.count(filter),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: users.map(user => plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })),
            meta: {
                currentPage: page,
                pageSize: limit,
                totalPages,
                totalItems,
            },
        };
    }

    // Tạo người dùng mới (đăng ký)
    async createUser(email: string, password: string, firstName: string, lastName: string): Promise<void> {
        const hashedPassword = await argon.hash(password);
        await this.userRepository.createUser(email, hashedPassword, firstName, lastName);
    }

    // Cập nhật refresh token cho người dùng
    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        await this.userRepository.updateRefreshToken(userId, refreshToken);
    }
}
