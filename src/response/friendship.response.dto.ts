import { Expose, Transform, Type } from 'class-transformer';

export class FriendshipUserDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

export class FriendshipResponseDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => FriendshipUserDto)
  requester: FriendshipUserDto;

  @Expose()
  @Type(() => FriendshipUserDto)
  recipient: FriendshipUserDto;
}

export class PendingFriendshipResponseDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => FriendshipUserDto)
  requester: FriendshipUserDto;
}