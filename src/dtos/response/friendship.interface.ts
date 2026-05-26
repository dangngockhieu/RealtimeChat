export interface FriendshipUserDto{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}
export interface FriendshipResponseDto {
    id: string;
    status: string;
    requester: FriendshipUserDto;
    recipient: FriendshipUserDto;
}