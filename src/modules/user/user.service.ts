import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChangePasswordDto, UpdateUserDto} from './dto/user.request.dto';
import * as argon from "argon2";
import aqp from 'api-query-params';
import { plainToInstance } from 'class-transformer';
import { PaginateResponse, UserResponseDto, UserValidatorDto, UserWithRefreshTokenDto } from '../../response';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async updatePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
        if(dto.newPassword !== dto.confirmPassword) {
            throw new BadRequestException('New password and confirm password do not match');
        }
        const user = await this.userModel.findById(userId);
        if(!user) {
            throw new NotFoundException('User not found');
        }
        const isMatch = await argon.verify(user.password, dto.oldPassword);
        if(!isMatch) {
            throw new ForbiddenException('Old password is incorrect');
        }
        const hashedPassword = await argon.hash(dto.newPassword);
        user.password = hashedPassword;
        await user.save();
    }

    async updateUserProfile(userId: string, dto:UpdateUserDto): Promise<UserResponseDto> {
        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: dto },
            { returnDocument: 'after', runValidators: true }
        )
        .select('-password')
        .lean({ virtuals: true })
        .exec();

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
        }

        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
    }

    async getUserById(userId: string): Promise<UserResponseDto> {
        const user = await this.userModel.findById(userId)
            .select('-password')
            .lean({ virtuals: true })
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    async getUserWithRefreshTokenById(userId: string): Promise<UserWithRefreshTokenDto> {
        const user = await this.userModel.findById(userId)
            .select('-password +refreshToken')
            .lean({ virtuals: true })
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserWithRefreshTokenDto, user, {
            excludeExtraneousValues: true,
        });
    }

    async getUserByEmail(email: string): Promise<UserResponseDto> {
        const user = await this.userModel.findOne({ email })
            .select('-password')
            .lean({ virtuals: true })
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    async getUserByEmailWithPassword(email: string): Promise<UserValidatorDto> {
        const user = await this.userModel.findOne({ email })
            .select('+password')
            .lean({ virtuals: true })
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserValidatorDto, user, {
            excludeExtraneousValues: true,
        });
    }

    async getAllUsesrs(page: number = 1, limit: number = 10, query: string): Promise<PaginateResponse<UserResponseDto>> {
        const skip = (page - 1) * limit;
        const { filter, sort, projection, population } = aqp(query);
        delete filter.page;
        delete filter.limit;

        const [users, totalItems] = await Promise.all([
            this.userModel.find(filter).select('-password')
                .select(projection)
                .sort(sort as any)
                .populate(population)
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true })
                .exec(),
            this.userModel.countDocuments(filter).exec(),
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
}
