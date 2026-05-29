import { Friendship, IFriendship, FriendshipStatus } from '../schemas/friendship.schema';
import { Types } from 'mongoose';

// Tìm xem 2 user đã có bất kỳ liên kết gì chưa
export const findFriendship = async (userId1: string, userId2: string) => {
    return await Friendship.findOne({
        $or: [
            { requester: userId1, recipient: userId2 },
            { requester: userId2, recipient: userId1 }
        ]
    })
    .select('recipient requester status blockedBy')
    .exec();
};

// Tìm liên kết bạn bè theo ID
export const findById = async (id: string, populateUsers = false) => {
    let query = Friendship.findById(id);
    if (populateUsers) {
        query = query.populate('requester', '_id email firstName lastName')
                     .populate('recipient', '_id email firstName lastName');
    }
    return await query
        .select('recipient requester status blockedBy')
        .exec();
};

// Tạo lời mời kết bạn mới
export const createFriendship = async (requesterId: string, recipientId: string, status: FriendshipStatus = FriendshipStatus.PENDING, blockedBy?: string) => {
    const friendship = new Friendship({
        requester: new Types.ObjectId(requesterId),
        recipient: new Types.ObjectId(recipientId),
        status,
        blockedBy: blockedBy ? new Types.ObjectId(blockedBy) : null
    });
    return await friendship.save();
};

// Cập nhật trạng thái lời mời kết bạn
export const saveFriendship = async (friendship: IFriendship) => {
    return await friendship.save();
};

// Tìm danh sách người dùng bị chặn
export const findBlockedFriendship = async (blockedBy: string, friendId: string) => {
    return await Friendship.findOne({
        blockedBy,
        status: FriendshipStatus.BLOCKED,
        $or: [
            { requester: blockedBy, recipient: friendId },
            { requester: friendId, recipient: blockedBy }
        ]
    }).exec();
};

// Xóa liên kết bạn bè theo ID
export const deleteFriendshipById = async (id: string) => {
    return await Friendship.findByIdAndDelete(id).exec();
};

// Bỏ chặn người dùng
export const deleteFriendshipBlocked = async (blockedBy: string, friendId: string) => {
    return await Friendship.findOneAndDelete({
        blockedBy: new Types.ObjectId(blockedBy),
        status: FriendshipStatus.BLOCKED,
        $or: [
            { requester: new Types.ObjectId(blockedBy), recipient: new Types.ObjectId(friendId) },
            { requester: new Types.ObjectId(friendId), recipient: new Types.ObjectId(blockedBy) }
        ]
    }).exec();
};

// Lấy danh sách bạn bè đã chấp nhận
export const getAcceptedFriendships = async (userId: string) => {
    const objectUserId = new Types.ObjectId(userId);
    return await Friendship.find({
        status: FriendshipStatus.ACCEPTED,
        $or: [
            { requester: objectUserId },
            { recipient: objectUserId }
        ]
    })
    .populate('requester', '_id email firstName lastName')
    .populate('recipient', '_id email firstName lastName')
    .lean()
    .exec();
};

// Lấy danh sách lời mời kết bạn đang chờ
export const getPendingFriendRequests = async (userId: string) => {
    const objectUserId = new Types.ObjectId(userId);
    return await Friendship.find({
        recipient: objectUserId,
        status: FriendshipStatus.PENDING
    })
    .populate('requester', '_id email firstName lastName')
    .lean()
    .exec();
};

// Lấy danh sách lời mời kết bạn đã gửi
export const getSendPendingFriend = async (userId: string) => {
    const objectUserId = new Types.ObjectId(userId);
    return await Friendship.find({
        requester: objectUserId,
        status: FriendshipStatus.PENDING
    })
    .populate('recipient', '_id email firstName lastName')
    .lean()
    .exec();
};

// Lấy danh sách người dùng bị chặn
export const getBlockedFriendships = async (userId: string) => {
    const objectUserId = new Types.ObjectId(userId);
    return await Friendship.find({
        status: FriendshipStatus.BLOCKED,
        blockedBy: objectUserId
    })
    .populate('requester', '_id email firstName lastName')
    .populate('recipient', '_id email firstName lastName')
    .lean()
    .exec();
};