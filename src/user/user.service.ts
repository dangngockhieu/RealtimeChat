import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChangePasswordDto, UpdateUserDto, UserResponseDto, UserValidatorDto } from './dto';
import * as argon from "argon2";
import { plainToInstance } from 'class-transformer';

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
            { new: true, runValidators: true }
        )
        .select('-password')
        .lean({ virtuals: true })
        .exec();

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
        }

        return plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: false,
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
            excludeExtraneousValues: false,
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
            excludeExtraneousValues: false,
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
            excludeExtraneousValues: false,
        });
    }
}
