import { Injectable} from '@nestjs/common';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/user.request.dto';

@Injectable()
export class UserRepository {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    // Tìm kiếm người dùng theo ID, có bao gồm mật khẩu (dành cho xác thực)
    async findByIdWithPassword(userId: string){
        return this.userModel.findById(userId).lean().exec();
    }

    // Cập nhật mật khẩu của người dùng
    async updatePassword(userId: string, hashedPassword: string){
        await this.userModel.findByIdAndUpdate(userId, { password: hashedPassword });
    }

    // Cập nhật thông tin cá nhân của người dùng (không bao gồm mật khẩu)
    async updateProfile(userId: string, dto: UpdateUserDto){
        return this.userModel.findByIdAndUpdate(
            userId,
            { $set: dto },
            { returnDocument: 'after', runValidators: true }
        )
        .select('-password')
        .lean()
        .exec();
    }

    // Tìm kiếm người dùng theo ID, không bao gồm mật khẩu (dành cho trả về thông tin người dùng)
    async findById(userId: string){
        return this.userModel.findById(userId)
            .select('-password')
            .lean()
            .exec();
    }


    // Tìm kiếm người dùng theo ID, có bao gồm refreshToken (dành cho xác thực)
    async findByIdWithRefreshToken(userId: string){
        return this.userModel.findById(userId)
            .select('-password +refreshToken')
            .lean()
            .exec();
    }

    // Tìm kiếm người dùng theo email, không bao gồm mật khẩu
    async findByEmail(email: string){
        return this.userModel.findOne({ email })
            .select('-password')
            .lean()
            .exec();
    }

    // Tìm kiếm người dùng theo email, có bao gồm mật khẩu (dành cho xác thực)
    async findByEmailWithPassword(email: string){
        return this.userModel.findOne({ email }).lean().exec();
    }

    // Tìm kiếm người dùng có filter, không bao gồm mật khẩu
    async findAll(filter: any, sort: any, projection: any, population: any, skip: number, limit: number){
        return this.userModel.find(filter).select('-password')
            .select(projection)
            .sort(sort as any)
            .populate(population)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();
    }

    // Đếm số lượng người dùng có filter
    async count(filter: any): Promise<number> {
        return this.userModel.countDocuments(filter).exec();
    }

    // Tạo người dùng mới
    async createUser(email: string, hashedPassword: string, firstName: string, lastName: string){
        await this.userModel.create({
                email: email,
                password: hashedPassword,
                firstName: firstName,
                lastName: lastName
        });
    }

    // Tạo tài khoản Quản trị viên (Admin) mặc định
    async createAdminUser(email: string, hashedPassword: string, firstName: string, lastName: string) {
        return this.userModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'ADMIN',
            isActive: true,
        });
    }

    // Find user by ID and update refresh token
    async updateRefreshToken(userId: string, hashedRefreshToken: string | null){
        await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { refreshToken: hashedRefreshToken } }
        ).exec();
    }

    // Tạo người dùng kèm mã OTP
    async createUserWithOtp(
        email: string,
        hashedPassword: string,
        firstName: string,
        lastName: string,
        otpCode: string,
        otpExpired: Date,
    ) {
        return this.userModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            otpCode,
            otpExpired,
            isActive: false,
        });
    }

    // Tìm kiếm người dùng kèm OTP code và hạn OTP
    async findByEmailWithOtp(email: string) {
        return this.userModel.findOne({ email }).select('+otpCode +otpExpired').lean().exec();
    }

    // Kích hoạt tài khoản người dùng
    async activateUser(userId: string) {
        await this.userModel.findByIdAndUpdate(userId, {
            $set: { isActive: true, otpCode: null, otpExpired: null },
        }).exec();
    }

    // Cập nhật lại mã OTP
    async updateOtp(userId: string, otpCode: string, otpExpired: Date) {
        await this.userModel.findByIdAndUpdate(userId, {
            $set: { otpCode, otpExpired },
        }).exec();
    }

    // Cập nhật ảnh đại diện (avatar)
    async updateAvatar(userId: string, avatarUrl: string | null) {
        return this.userModel.findByIdAndUpdate(
            userId,
            { $set: { avatar: avatarUrl } },
            { returnDocument: 'after' },
        ).select('-password').lean().exec();
    }
}
