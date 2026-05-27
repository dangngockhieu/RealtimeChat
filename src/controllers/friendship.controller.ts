import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.dto';
import {
    acceptFriendshipService,
    blockFriendshipService,
    createFriendshipService,
    declineFriendshipService,
    getBlockedUsersService,
    getFriendshipsForUser,
    getPendingFriendRequestsService,
    getSendPendingFriendService,
    removeFriendshipService,
    removeSendFriendshipService,
    unBlockFriendshipService
} from '../services/friendship.service';
import { FriendRequestDto } from '../dtos/request/friendship.dto';

// Lấy danh sách bạn bè của người dùng hiện tại
export const getFriendships = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendships = await getFriendshipsForUser(user.id);
    res.customSuccess(friendships, 'Lấy danh sách bạn bè thành công');
};

// Lấy danh sách lời mời kết bạn đang chờ
export const getPendingFriendships = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendships = await getPendingFriendRequestsService(user.id);
    res.customSuccess(friendships, 'Lấy danh sách lời mời kết bạn thành công');
}

// Lấy danh sách lời mời kết bạn đã gửi
export const getSendPendingFriend = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendships = await getSendPendingFriendService(user.id);
    res.customSuccess(friendships, 'Lấy danh sách lời mời kết đã gửi thành công');
}

// Lấy danh sách người dùng bị chặn
export const getBlockedUsers = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const blockedUsers = await getBlockedUsersService(user.id);
    res.customSuccess(blockedUsers, 'Lấy danh sách người dùng bị chặn thành công');
};

// Tạo lời mời kết bạn mới
export const createFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { friendId } = req.body as FriendRequestDto;
    const friendship = await createFriendshipService(user.id, friendId);
    res.customSuccess(friendship, 'Gửi lời mời kết bạn thành công');
};

// Chặn người dùng
export const blockFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { friendId } = req.body as FriendRequestDto;
    await blockFriendshipService(user.id, friendId);
    res.customSuccess(null, 'Chặn người dùng thành công');
}

// Bỏ chặn người dùng
export const unBlockFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendId = req.params.friendId as string;
    await unBlockFriendshipService(user.id, friendId);
    res.customSuccess(null, 'Bỏ chặn người dùng thành công');
}

// Hủy lời mời kết bạn đã gửi
export const removeSendFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await removeSendFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Hủy lời mời kết bạn thành công');
}

// Xóa bạn bè
export const deleteFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await removeFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Hủy kết bạn thành công');
}

// Accept lời mời kết bạn
export const acceptFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await acceptFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Chấp nhận lời mời kết bạn thành công');
}

// Từ chối lời mời kết bạn
export const declineFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await declineFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Từ chối lời mời kết bạn thành công');
};