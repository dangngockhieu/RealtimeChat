import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangePasswordDto, UpdateUserDto} from './dto/user.request.dto';
import * as argon from "argon2";
import aqp from 'api-query-params';
import { plainToInstance } from 'class-transformer';
import { PaginateResponse, UserResponseDto, UserValidatorDto, UserWithRefreshTokenDto } from '../../response';
import { UserRepository } from './user.repository';
import { UploadService } from '../upload/upload.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly uploadService: UploadService,
        private readonly redisService: RedisService,
    ) {}

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
        await this.redisService.del(`user:profile:${userId}`);
    }

    // Cập nhật thông tin cá nhân của người dùng
    async updateUserProfile(userId: string, dto:UpdateUserDto): Promise<UserResponseDto> {
        const updatedUser = await this.userRepository.updateProfile(userId, dto);

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
        }

        await this.redisService.del(`user:profile:${userId}`);

        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    // Lấy thông tin người dùng theo ID (hỗ trợ Redis Caching)
    async getUserById(userId: string): Promise<UserResponseDto> {
        const cacheKey = `user:profile:${userId}`;
        const cached = await this.redisService.get<UserResponseDto>(cacheKey);
        if (cached) {
            return cached;
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const userDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        await this.redisService.set(cacheKey, userDto, 300); // Cache 5 phút
        return userDto;
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

    // Tạo người dùng mới kèm mã OTP kích hoạt
    async createUserWithOtp(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        otpCode: string,
        otpExpired: Date,
    ): Promise<void> {
        const hashedPassword = await argon.hash(password);
        await this.userRepository.createUserWithOtp(
            email,
            hashedPassword,
            firstName,
            lastName,
            otpCode,
            otpExpired,
        );
    }

    // Lấy thông tin người dùng kèm OTP (phục vụ xác thực OTP)
    async getUserByEmailWithOtp(email: string) {
        return this.userRepository.findByEmailWithOtp(email);
    }

    // Kích hoạt tài khoản
    async activateUser(userId: string): Promise<void> {
        await this.userRepository.activateUser(userId);
    }

    // Cập nhật mã OTP mới
    async updateOtp(userId: string, otpCode: string, otpExpired: Date): Promise<void> {
        await this.userRepository.updateOtp(userId, otpCode, otpExpired);
    }

    // Cập nhật ảnh đại diện người dùng qua URL (xóa file avatar cũ nếu khác)
    async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto> {
        const currentUser = await this.userRepository.findById(userId);
        if (!currentUser) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        // Nếu người dùng đã có avatar cũ và khác với avatar mới, xóa file cũ trên đĩa
        if (currentUser.avatar && currentUser.avatar !== avatarUrl) {
            this.uploadService.deleteFileByUrl(currentUser.avatar);
        }

        const updatedUser = await this.userRepository.updateAvatar(userId, avatarUrl);
        await this.redisService.del(`user:profile:${userId}`);
        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    // Tải lên và thay đổi ảnh đại diện cá nhân (xóa file cũ trên đĩa)
    async uploadAndChangeAvatar(userId: string, file?: Express.Multer.File): Promise<UserResponseDto> {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên');
        }

        const currentUser = await this.userRepository.findById(userId);
        if (!currentUser) {
            // Xóa file vừa upload để tránh tồn đọng file rác
            this.uploadService.deleteFileByUrl(`/public/uploads/avatars/${file.filename}`);
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        // Xóa avatar cũ nếu có trên đĩa
        if (currentUser.avatar) {
            this.uploadService.deleteFileByUrl(currentUser.avatar);
        }

        const newAvatarUrl = `/public/uploads/avatars/${file.filename}`;
        const updatedUser = await this.userRepository.updateAvatar(userId, newAvatarUrl);
        await this.redisService.del(`user:profile:${userId}`);
        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    // Gỡ ảnh đại diện người dùng (xóa file cũ trên đĩa và cập nhật DB về null)
    async removeAvatar(userId: string): Promise<UserResponseDto> {
        const currentUser = await this.userRepository.findById(userId);
        if (!currentUser) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        // Xóa avatar cũ nếu có trên đĩa
        if (currentUser.avatar) {
            this.uploadService.deleteFileByUrl(currentUser.avatar);
        }

        const updatedUser = await this.userRepository.updateAvatar(userId, null);
        await this.redisService.del(`user:profile:${userId}`);
        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    // Cập nhật refresh token cho người dùng
    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        await this.userRepository.updateRefreshToken(userId, refreshToken);
    }
}
