import { UpdateUserDto } from '../dtos/request/user.dto';
import { User } from '../schemas/user.schema';

export const findByIdWithPassword = async (userId: string) => {
    return await User.findById(userId)
        .select('+password')
        .lean()
        .exec();
};

export const updatePassword = async (userId: string, hashedPassword: string) => {
    return await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword })
        .exec();
};

export const updateProfile = async (userId: string, dto: UpdateUserDto) => {
    return await User.findByIdAndUpdate(
        userId, { $set: dto },
        { returnDocument: 'after', runValidators: true })
        .select('-password')
        .lean()
        .exec();
};

export const findById = async (userId: string) => {
    return await User.findById(userId)
        .select('-password')
        .lean()
        .exec();
};

export const findByIdWithRefreshToken = async (userId: string) => {
    return await User.findById(userId)
        .select('-password +refreshToken')
        .lean()
        .exec();
};

export const findByEmail = async (email: string) => {
    return await User.findOne({ email })
        .select('-password')
        .lean()
        .exec();
};

export const findByEmailWithPassword = async (email: string) => {
    return await User.findOne({ email })
        .select('+password')
        .lean()
        .exec();
};

export const findAll = async (filter: any, sort: any, skip: number, limit: number) => {
    return await User.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
};

export const count = async (filter: any): Promise<number> => {
    return await User.countDocuments(filter).exec();
};

export const createUser = async (email: string, hashedPassword: string, firstName: string, lastName: string) => {
    return await User.create({ email, password: hashedPassword, firstName, lastName });
};

export const updateRefreshToken = async (userId: string, hashedRefreshToken: string | null) => {
    return await User.findByIdAndUpdate(
        userId,
        { $set: { refreshToken: hashedRefreshToken } })
        .exec();
};

export default {
    findByIdWithPassword,
    updatePassword,
    updateProfile,
    findById,
    findByIdWithRefreshToken,
    findByEmail,
    findByEmailWithPassword,
    findAll,
    count,
    createUser,
    updateRefreshToken,
};