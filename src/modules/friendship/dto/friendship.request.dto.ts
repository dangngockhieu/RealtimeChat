import { IsNotEmpty } from "class-validator";

export class FriendRequestDto {
    @IsNotEmpty({ message: 'friendId không được để trống' })
    friendId: string;
}