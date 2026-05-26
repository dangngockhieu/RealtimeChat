import { Friendship, IFriendship, FriendshipStatus } from '../schemas/friendship.schema';
import { Types } from 'mongoose';

// Tìm xem 2 user đã có bất kỳ liên kết gì chưa
export const findFriendship = async (userId1: string, userId2: string) => {
    return await Friendship.findOne({
        $or: [
            { requester: userId1, recipient: userId2 },
            { requester: userId2, recipient: userId1 }
        ]
    }).exec();
};

export const findById = async (id: string, populateUsers = false) => {
    let query = Friendship.findById(id);
    if (populateUsers) {
        query = query.populate('requester', '_id email firstName lastName')
                     .populate('recipient', '_id email firstName lastName');
    }
    return await query.exec();
};

export const createFriendship = async (requesterId: string, recipientId: string, status: FriendshipStatus = FriendshipStatus.PENDING, blockedBy?: string) => {
    const friendship = new Friendship({
        requester: new Types.ObjectId(requesterId),
        recipient: new Types.ObjectId(recipientId),
        status,
        blockedBy: blockedBy ? new Types.ObjectId(blockedBy) : null
    });
    return await friendship.save();
};

export const saveFriendship = async (friendship: IFriendship) => {
    return await friendship.save();
};

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

export const deleteFriendshipById = async (id: string) => {
    return await Friendship.findByIdAndDelete(id).exec();
};

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