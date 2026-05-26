import { Request, Response } from 'express';
import { UserAccount } from '../dtos/response/auth.interface';
import {
    acceptFriendshipService,
    blockFriendshipService,
    createFriendshipService,
    declineFriendshipService,
    getBlockedUsersService,
    getFriendshipsForUser,
    getPendingFriendRequestsService,
    removeFriendshipService,
    removeSendFriendshipService,
    unBlockFriendshipService
} from '../services/friendship.service';
import { FriendRequestDto } from '../dtos/request/friendship.dto';

export const getFriendships = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendships = await getFriendshipsForUser(user.id);
    res.customSuccess(friendships, 'Lấy danh sách bạn bè thành công');
};

export const getPendingFriendships = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendships = await getPendingFriendRequestsService(user.id);
    res.customSuccess(friendships, 'Lấy danh sách lời mời kết bạn thành công');
}

export const getBlockedUsers = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const blockedUsers = await getBlockedUsersService(user.id);
    res.customSuccess(blockedUsers, 'Lấy danh sách người dùng bị chặn thành công');
};

export const createFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { friendId } = req.body as FriendRequestDto;
    const friendship = await createFriendshipService(user.id, friendId);
    res.customSuccess(friendship, 'Gửi lời mời kết bạn thành công');
};

export const blockFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { friendId } = req.body as FriendRequestDto;
    await blockFriendshipService(user.id, friendId);
    res.customSuccess(null, 'Chặn người dùng thành công');
}

export const unBlockFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const { friendId } = req.body as FriendRequestDto;
    await unBlockFriendshipService(user.id, friendId);
    res.customSuccess(null, 'Bỏ chặn người dùng thành công');
}

export const removeSendFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await removeSendFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Hủy lời mời kết bạn thành công');
}

export const deleteFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await removeFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Hủy kết bạn thành công');
}

export const acceptFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await acceptFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Chấp nhận lời mời kết bạn thành công');
}

export const declineFriendship = async (req: Request, res: Response) => {
    const user = req.user as UserAccount;
    const friendshipId = req.params.id as string;
    await declineFriendshipService(user.id, friendshipId);
    res.customSuccess(null, 'Từ chối lời mời kết bạn thành công');
};