import { FriendshipStatus } from "../../schemas/friendship.schema";

export interface FriendshipUserDto{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}
export interface FriendshipResponseDto {
    id: string;
    status: FriendshipStatus;
    requester: FriendshipUserDto;
    recipient: FriendshipUserDto;
}