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
        });;
    }

    // Find user by ID and update refresh token
    async updateRefreshToken(userId: string, hashedRefreshToken: string | null){
        await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { refreshToken: hashedRefreshToken } }
        ).exec();
    }
}
