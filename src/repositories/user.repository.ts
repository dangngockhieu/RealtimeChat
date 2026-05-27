import { UpdateUserDto } from '../dtos/request/user.dto';
import { User } from '../schemas/user.schema';

// Tìm người dùng theo ID và bao gồm mật khẩu
export const findByIdWithPassword = async (userId: string) => {
    return await User.findById(userId)
        .select('+password')
        .lean()
        .exec();
};

// Cập nhật mật khẩu người dùng
export const updatePassword = async (userId: string, hashedPassword: string) => {
    return await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword })
        .exec();
};

// Cập nhật hồ sơ người dùng
export const updateProfile = async (userId: string, dto: UpdateUserDto) => {
    return await User.findByIdAndUpdate(
        userId, { $set: dto },
        { returnDocument: 'after', runValidators: true })
        .select('-password')
        .lean()
        .exec();
};

// Tìm người dùng theo ID (không bao gồm mật khẩu)
export const findById = async (userId: string) => {
    return await User.findById(userId)
        .select('-password')
        .lean()
        .exec();
};

// Tìm người dùng theo ID và bao gồm refreshToken
export const findByIdWithRefreshToken = async (userId: string) => {
    return await User.findById(userId)
        .select('-password +refreshToken')
        .lean()
        .exec();
};

// Tìm người dùng theo email (không bao gồm mật khẩu)
export const findByEmail = async (email: string) => {
    return await User.findOne({ email })
        .select('-password')
        .lean()
        .exec();
};

// Tìm người dùng theo email và bao gồm mật khẩu
export const findByEmailWithPassword = async (email: string) => {
    return await User.findOne({ email })
        .select('+password')
        .lean()
        .exec();
};

// Tìm tat cả người dùng với phân trang và lọc
export const findAll = async (filter: any, sort: any, skip: number, limit: number) => {
    return await User.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
};

// Đếm số lượng người dùng
export const count = async (filter: any): Promise<number> => {
    return await User.countDocuments(filter).exec();
};

// Tạo người dùng mới
export const createUser = async (email: string, hashedPassword: string, firstName: string, lastName: string) => {
    return await User.create({ email, password: hashedPassword, firstName, lastName });
};

// Cập nhật refreshToken của người dùng
export const updateRefreshToken = async (userId: string, hashedRefreshToken: string | null) => {
    return await User.findByIdAndUpdate(
        userId,
        { $set: { refreshToken: hashedRefreshToken } })
        .exec();
};