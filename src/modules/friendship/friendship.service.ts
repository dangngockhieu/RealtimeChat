import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Friendship } from './schemas/friendship.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FriendshipResponseDto, FriendshipUserDto, PendingFriendshipResponseDto } from '../../response';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';

@Injectable()
export class FriendshipService {
    constructor(@InjectModel(Friendship.name) private friendShipModel: Model<Friendship>) {}

    // Tạo lời mời kết bạn
    async createFriendship(userId: string, friendId: string): Promise<FriendshipResponseDto> {
        if (userId === friendId) {
            throw new BadRequestException('Không thể gửi lời mời kết bạn cho chính mình');
        }
        const existingFriendship = await this.friendShipModel.findOne({
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId },
            ],
        } as any).exec();

        if (existingFriendship) {
            if (existingFriendship.status === 'BLOCKED') {
                throw new ForbiddenException('Không thể gửi lời mời kết bạn khi đang có chặn');
            }

            if (existingFriendship.status === 'ACCEPTED') {
                throw new ConflictException('Hai người đã là bạn bè');
            }

            if (
                existingFriendship.status === 'PENDING' &&
                existingFriendship.requester.toString() === userId
            ) {
                throw new ConflictException('Bạn đã gửi lời mời kết bạn trước đó');
            }

            if (
                existingFriendship.status === 'PENDING' &&
                existingFriendship.recipient.toString() === userId
            ) {
                throw new ConflictException('Người này đã gửi lời mời kết bạn cho bạn');
            }

            if (
                existingFriendship.status === 'DECLINED' &&
                existingFriendship.recipient.toString() === userId
            ) {
                existingFriendship.status = 'PENDING';
                existingFriendship.requester = new Types.ObjectId(userId) as any;
                existingFriendship.recipient = new Types.ObjectId(friendId) as any;
                await existingFriendship.save();

                const friendship = await this.friendShipModel
                    .findById(existingFriendship._id)
                    .populate('requester', '_id email firstName lastName')
                    .populate('recipient', '_id email firstName lastName')
                    .lean()
                    .exec();

                return plainToInstance(FriendshipResponseDto, friendship, {
                    excludeExtraneousValues: true,
                });
            }

            if (existingFriendship.status === 'DECLINED') {
                throw new ConflictException('Lời mời kết bạn này đã từng bị từ chối');
            }
        }
        // Nếu chưa tồn tại mối quan hệ nào thì tạo mới
        const newFriendship = new this.friendShipModel({
            requester: new Types.ObjectId(userId),
            recipient: new Types.ObjectId(friendId),
            status: 'PENDING',
        });
        const savedFriendship = await newFriendship.save();
        const friendship = await this.friendShipModel
            .findById(savedFriendship._id)
            .populate('requester', '_id email firstName lastName')
            .populate('recipient', '_id email firstName lastName')
            .lean()
            .exec();

        return plainToInstance(FriendshipResponseDto, friendship, {
            excludeExtraneousValues: true,
        });
    }

    // Chấp nhận lời mời kết bạn
    async acceptFriendship(userId: string, friendshipId: string): Promise<void> {
        const friendship = await this.friendShipModel.findById(friendshipId).exec();

        // Kiểm tra nếu lời mời kết bạn không tồn tại
        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

        // Chỉ người nhận mới có quyền chấp nhận lời mời kết bạn
        const isRecipient = friendship.recipient.toString() === userId;
        if (!isRecipient) {
            throw new ForbiddenException('Bạn không có quyền chấp nhận lời mời này');
        }

        // Chỉ có thể chấp nhận lời mời kết bạn nếu nó đang ở trạng thái PENDING
        if (friendship.status !== 'PENDING') {
            throw new BadRequestException('Lời mời kết bạn không còn ở trạng thái chờ');
        }

        friendship.status = 'ACCEPTED';
        await friendship.save();
    }

    // Từ chối lời mời kết bạn
    async declineFriendship(userId: string, friendshipId: string): Promise<void> {
        const friendship = await this.friendShipModel.findById(friendshipId).exec();

        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

        // Chỉ người nhận mới có quyền từ chối lời mời kết bạn
        const isRecipient = friendship.recipient.toString() === userId;
        if (!isRecipient) {
            throw new ForbiddenException('Bạn không có quyền hủy lời mời này');
        }

        if (friendship.status !== 'PENDING') {
            throw new BadRequestException('Lời mời kết bạn không còn ở trạng thái chờ');
        }

        friendship.status = 'DECLINED';
        await friendship.save();
    }

    // Chặn người dùng
    async blockFriendship(userId: string, friendId: string): Promise<void> {
        if (userId === friendId) {
            throw new BadRequestException('Bạn không thể tự chặn chính mình');
        }
        const friendship = await this.friendShipModel.findOne({
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId },
            ],
        } as any).exec();

        // Nếu chưa tồn tại mối quan hệ nào
        if (!friendship) {
            const newFriendship = new this.friendShipModel({
                requester: new Types.ObjectId(userId),
                recipient: new Types.ObjectId(friendId),
                status: 'BLOCKED',
                blockedBy: new Types.ObjectId(userId),
            });

            await newFriendship.save();
            return;
        }
        const isRecipient = friendship.recipient.toString() === userId;
        const isRequester = friendship.requester.toString() === userId;

        if (!isRecipient && !isRequester) {
            throw new ForbiddenException('Bạn không thuộc mối quan hệ này');
        }

        friendship.status = 'BLOCKED';
        friendship.blockedBy = new Types.ObjectId(userId) as any;
        await friendship.save();
    }

    // Bỏ chặn người dùng
    async unBlockFriendship(userId: string, friendId: string): Promise<void> {
        const friendship = await this.friendShipModel.findOneAndDelete({
            blockedBy: userId,
            status: 'BLOCKED',
            $or: [
            { requester: userId, recipient: friendId },
            { requester: friendId, recipient: userId },
            ],
        } as any).exec();

        if (!friendship) {
            throw new NotFoundException('Không tìm thấy quan hệ chặn');
        }
    }

    // Lấy danh sách bạn bè của người dùng
    async getFriendshipsForUser(userId: string): Promise<FriendshipUserDto[]> {
        const objectUserId = new Types.ObjectId(userId);
        const blockedFriendships = await this.friendShipModel
            .find({
                status: 'ACCEPTED',
                $or: [
                    { requester: objectUserId },
                    { recipient: objectUserId },
                ],
            } as any)
            .populate('requester', '_id email firstName lastName')
            .populate('recipient', '_id email firstName lastName')
            .lean()
            .exec();
        return blockedFriendships.map((friendship: any) => {
            const blockedUser =
                friendship.requester._id.toString() === userId
                ? friendship.recipient
                : friendship.requester;

            return plainToInstance(FriendshipUserDto, blockedUser, {
                excludeExtraneousValues: true,
            });
        });
    }

    // Lấy danh sách lời mời kết bạn đang chờ
    async getPendingFriendRequests(userId: string): Promise<PendingFriendshipResponseDto[]> {
        const objectUserId = new Types.ObjectId(userId);
        const pendingFriendships = await this.friendShipModel
            .find({
                recipient: objectUserId,
                status: 'PENDING',
            } as any)
            .populate('requester', '_id email firstName lastName')
            .lean()
            .exec();

        return pendingFriendships.map((friendship) =>
            plainToInstance(PendingFriendshipResponseDto, friendship, {
            excludeExtraneousValues: true,
            }),
        );
    }

    // Lấy danh sách người dùng đã chặn
    async getBlockedUsers(userId: string): Promise<FriendshipUserDto[]> {
        const objectUserId = new Types.ObjectId(userId);
        const blockedFriendships = await this.friendShipModel
            .find({
                status: 'BLOCKED',
                blockedBy: objectUserId,
            } as any)
            .populate('requester', '_id email firstName lastName')
            .populate('recipient', '_id email firstName lastName')
            .lean()
            .exec();
        return blockedFriendships.map((friendship: any) => {
            const blockedUser =
                friendship.requester._id.toString() === userId
                ? friendship.recipient
                : friendship.requester;

            return plainToInstance(FriendshipUserDto, blockedUser, {
                excludeExtraneousValues: true,
            });
        });
    }

    // Hủy gửi lời mời kết bạn đang chờ
    async removeSendFriendship(userId: string, friendshipId: string): Promise<void> {
        const friendship = await this.friendShipModel.findById(friendshipId).exec();

        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

        const isRequester = friendship.requester.toString() === userId;

        if (friendship.status === 'PENDING' && isRequester) {
            await this.friendShipModel.findByIdAndDelete(friendshipId).exec();
            return;
        }
        throw new ForbiddenException('Chỉ người gửi lời mời mới có thể hủy lời mời kết bạn đang chờ');
    }

    // Xóa bạn bè
    async removeFriendship(userId: string, friendshipId: string): Promise<void> {
        const friendship = await this.friendShipModel.findById(friendshipId).exec();

        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

        const isRequester = friendship.requester.toString() === userId;
        const isRecipient = friendship.recipient.toString() === userId;

        if (friendship.status === 'ACCEPTED' && (isRequester || isRecipient)) {
            await this.friendShipModel.findByIdAndDelete(friendshipId).exec();
            return;
        }
        throw new ForbiddenException('Chỉ bạn bè mới có thể xóa mối quan hệ này');
    }

}
