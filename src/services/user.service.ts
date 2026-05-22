import * as argon from 'argon2';
import { ChangePasswordDto, UpdateUserDto } from '../dtos/request/user.dto';
import { UserResponseDto, PaginateResponse } from '../dtos/response/user.interface';
import { count,
    createUser as createUserRepository,
    findAll,
    findByEmail,
    findByEmailWithPassword,
    findById,
    findByIdWithPassword,
    findByIdWithRefreshToken,
    updatePassword as updatePasswordRepository,
    updateProfile,
    updateRefreshToken as updateRefreshTokenRepository,
} from '../repositories/user.repository';
import { BadRequestException, NotFoundException } from '../middlewares/formatResponse/exception/customException';

function toUserResponse(user: any): UserResponseDto {
  return {
    id:         user._id.toString(),
    email:      user.email,
    firstName:  user.firstName,
    lastName:   user.lastName,
    role:       user.role,
    isActive:   user.isActive,
    createdAt:  user.createdAt,
    updatedAt:  user.updatedAt,
  };
}
export const updatePassword = async (userId: string, dto: ChangePasswordDto): Promise<void> => {
    if (dto.newPassword !== dto.confirmPassword) {
        throw BadRequestException('New password and confirm password do not match');
    }

    const user = await findByIdWithPassword(userId);
    if (!user) {
        throw NotFoundException('User not found');
    }

    const isMatch = await argon.verify(user.password, dto.oldPassword);
    if (!isMatch) {
        throw BadRequestException('Old password is incorrect');
    }

    const hashedPassword = await argon.hash(dto.newPassword);
    await updatePasswordRepository(userId, hashedPassword);
};

export const updateUserProfile = async (userId: string, dto: UpdateUserDto): Promise<UserResponseDto> => {
    const updated = await updateProfile(userId, dto);
    if (!updated) throw NotFoundException('User not found');
    return toUserResponse(updated);
};

export const getUserById = async (userId: string): Promise<UserResponseDto> => {
    const user = await findById(userId);
    if (!user) throw NotFoundException('User not found');
    return toUserResponse(user);
};

export const getUserByEmail = async (email: string): Promise<UserResponseDto> => {
    const user = await findByEmail(email);
    if (!user) throw NotFoundException('User not found');
    return toUserResponse(user);
};

export const getUserByEmailWithPassword = async (email: string) => {
    const user = await findByEmailWithPassword(email);
    if (!user) throw NotFoundException('User not found');
    return user;
};

export const getUserWithRefreshTokenById = async (userId: string) => {
    const user = await findByIdWithRefreshToken(userId);
    if (!user) throw NotFoundException('User not found');
    return user;
};

export const getAllUsers = async (page = 1, limit = 10, filter: any = {}): Promise<PaginateResponse<UserResponseDto>> => {
    const skip = (page - 1) * limit;
    const [users, totalItems] = await Promise.all([findAll(filter, { createdAt: -1 }, skip, limit), count(filter)]);

    return {
        data: users.map(toUserResponse),
        meta: {
            currentPage: page,
            pageSize: limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
        },
    };
};

export const createUser = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    const hashedPassword = await argon.hash(password);
    await createUserRepository(email, hashedPassword, firstName, lastName);
};

export const updateRefreshToken = async (userId: string, refreshToken: string | null): Promise<void> => {
    await updateRefreshTokenRepository(userId, refreshToken);
};

export default {
    updatePassword,
    updateUserProfile,
    getUserById,
    getUserByEmail,
    getUserByEmailWithPassword,
    getUserWithRefreshTokenById,
    getAllUsers,
    createUser,
    updateRefreshToken,
};
