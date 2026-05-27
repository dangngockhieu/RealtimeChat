import { Types } from 'mongoose';
import { FriendshipStatus } from '../schemas/friendship.schema';
import {
    findFriendship,
    findById,
    createFriendship as createFriendshipRepo,
    saveFriendship,
    deleteFriendshipById,
    deleteFriendshipBlocked,
    getAcceptedFriendships,
    getPendingFriendRequests,
    getBlockedFriendships,
    getSendPendingFriend
} from '../repositories/friendship.repository';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '../middlewares/formatResponse/exception/customException';
import { FriendshipResponseDto, FriendshipUserDto } from '../dtos/response/friendship.interface';

// Helper format trả về
const toFriendshipUserDto = (user: any): FriendshipUserDto => {
    return {
        id: user._id?.toString() || user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    };
};

export const createFriendshipService = async (userId: string, friendId: string): Promise<FriendshipResponseDto> => {
    if (userId === friendId) {
        throw BadRequestException('Không thể gửi lời mời kết bạn cho chính mình');
    }

    const existingFriendship = await findFriendship(userId, friendId);

    if (existingFriendship) {
        if (existingFriendship.status === FriendshipStatus.BLOCKED) {
            throw ForbiddenException('Không thể gửi lời mời kết bạn khi đang có chặn');
        }

        if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
            throw ConflictException('Hai người đã là bạn bè');
        }

        if (
            existingFriendship.status === FriendshipStatus.PENDING &&
            existingFriendship.requester.toString() === userId
        ) {
            throw ConflictException('Bạn đã gửi lời mời kết bạn trước đó');
        }

        if (
            existingFriendship.status === FriendshipStatus.PENDING &&
            existingFriendship.recipient.toString() === userId
        ) {
            throw ConflictException('Người này đã gửi lời mời kết bạn cho bạn');
        }

        if (
            existingFriendship.status === FriendshipStatus.DECLINED &&
            existingFriendship.recipient.toString() === userId
        ) {
            existingFriendship.status = FriendshipStatus.PENDING;
            existingFriendship.requester = new Types.ObjectId(userId) as any;
            existingFriendship.recipient = new Types.ObjectId(friendId) as any;
            await saveFriendship(existingFriendship);

            const friendship = await findById(existingFriendship._id.toString(), true);
            return {
                id: friendship?._id.toString() as string,
                status: friendship?.status as string,
                requester: toFriendshipUserDto(friendship?.requester),
                recipient: toFriendshipUserDto(friendship?.recipient),
            };
        }

        if (existingFriendship.status === FriendshipStatus.DECLINED) {
            throw ConflictException('Lời mời kết bạn này đã từng bị từ chối');
        }
    }

    // Tạo mới
    const savedFriendship = await createFriendshipRepo(userId, friendId, FriendshipStatus.PENDING);
    const friendship = await findById(savedFriendship._id.toString(), true);
    return {
        id: friendship?._id.toString() as string,
        status: friendship?.status as string,
        requester: toFriendshipUserDto(friendship?.requester),
        recipient: toFriendshipUserDto(friendship?.recipient),
    };
};

export const acceptFriendshipService = async (userId: string, friendshipId: string): Promise<void> => {
    const friendship = await findById(friendshipId);

    if (!friendship) {
        throw NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    const isRecipient = friendship.recipient.toString() === userId;
    if (!isRecipient) {
        throw ForbiddenException('Bạn không có quyền chấp nhận lời mời này');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
        throw BadRequestException('Lời mời kết bạn không còn ở trạng thái chờ');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    await saveFriendship(friendship);
};

export const declineFriendshipService = async (userId: string, friendshipId: string): Promise<void> => {
    const friendship = await findById(friendshipId);

    if (!friendship) {
        throw NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    const isRecipient = friendship.recipient.toString() === userId;
    if (!isRecipient) {
        throw ForbiddenException('Bạn không có quyền hủy lời mời này');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
        throw BadRequestException('Lời mời kết bạn không còn ở trạng thái chờ');
    }

    friendship.status = FriendshipStatus.DECLINED;
    await saveFriendship(friendship);
};

// Chặn người dùng
export const blockFriendshipService = async (userId: string, friendId: string): Promise<void> => {
    if (userId === friendId) {
        throw BadRequestException('Bạn không thể tự chặn chính mình');
    }

    const friendship = await findFriendship(userId, friendId);

    // Nếu chưa tồn tại mối quan hệ nào
    if (!friendship) {
        await createFriendshipRepo(userId, friendId, FriendshipStatus.BLOCKED, userId);
        return;
    }

    const isRecipient = friendship.recipient.toString() === userId;
    const isRequester = friendship.requester.toString() === userId;

    if (!isRecipient && !isRequester) {
        throw ForbiddenException('Bạn không thuộc mối quan hệ này');
    }

    friendship.status = FriendshipStatus.BLOCKED;
    friendship.blockedBy = new Types.ObjectId(userId) as any;
    await saveFriendship(friendship);
};

// Bỏ chặn người dùng
export const unBlockFriendshipService = async (userId: string, friendId: string): Promise<void> => {
    const friendship = await deleteFriendshipBlocked(userId, friendId);
    if (!friendship) {
        throw NotFoundException('Không tìm thấy quan hệ chặn');
    }
};

// Lấy danh sách bạn bè
export const getFriendshipsForUser = async (userId: string): Promise<FriendshipUserDto[]> => {
    const acceptedFriendships = await getAcceptedFriendships(userId);

    return acceptedFriendships.map((friendship: any) => {
        const friend = friendship.requester._id.toString() === userId
            ? friendship.recipient
            : friendship.requester;
        return toFriendshipUserDto(friend);
    });
};

// Lấy list request pending (được gửi tới mình)
export const getPendingFriendRequestsService = async (userId: string) => {
    const pendingFriendships = await getPendingFriendRequests(userId);
    return pendingFriendships.map((friendship: any) => {
        return {
            id: friendship._id.toString(),
            status: friendship.status,
            requester: toFriendshipUserDto(friendship.requester)
        };
    });
};

// Lấy list request pending (mình đã gửi)
export const getSendPendingFriendService = async (userId: string) => {
    const pendingFriendships = await getSendPendingFriend(userId);
    return pendingFriendships.map((friendship: any) => {
        return {
            id: friendship._id.toString(),
            status: friendship.status,
            recipient: toFriendshipUserDto(friendship.recipient)
        };
    });
};

// Lấy danh sách đang chặn
export const getBlockedUsersService = async (userId: string): Promise<FriendshipUserDto[]> => {
    const blockedFriendships = await getBlockedFriendships(userId);
    return blockedFriendships.map((friendship: any) => {
        const blockedUser = friendship.requester._id.toString() === userId
            ? friendship.recipient
            : friendship.requester;
        return toFriendshipUserDto(blockedUser);
    });
};

// Hủy gửi lời mời
export const removeSendFriendshipService = async (userId: string, friendshipId: string): Promise<void> => {
    const friendship = await findById(friendshipId);

    if (!friendship) {
        throw NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    const isRequester = friendship.requester.toString() === userId;

    if (friendship.status === FriendshipStatus.PENDING && isRequester) {
        await deleteFriendshipById(friendshipId);
        return;
    }

    throw ForbiddenException('Chỉ người gửi lời mời mới có thể hủy lời mời kết bạn đang chờ');
};

// Xóa bạn bè
export const removeFriendshipService = async (userId: string, friendshipId: string): Promise<void> => {
    const friendship = await findById(friendshipId);

    if (!friendship) {
        throw NotFoundException('Không tìm thấy bạn bè để xóa');
    }

    const isRequester = friendship.requester.toString() === userId;
    const isRecipient = friendship.recipient.toString() === userId;

    if (friendship.status === FriendshipStatus.ACCEPTED && (isRequester || isRecipient)) {
        await deleteFriendshipById(friendshipId);
        return;
    }

    throw ForbiddenException('Chỉ bạn bè mới có thể xóa mối quan hệ này');
};
