import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class FriendRequestDto {
  @ApiProperty({
    example: '65f1a2b3c4d5e6f7a8b9c0d2',
    description: 'ID của người dùng cần kết bạn hoặc cần chặn',
  })
  @IsMongoId({ message: 'friendId phải là định dạng MongoId hợp lệ' })
  @IsNotEmpty({ message: 'friendId không được để trống' })
  friendId: string;
}