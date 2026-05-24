import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateDirectChatDto {
  @ApiProperty({
    example: '65f1a2b3c4d5e6f7a8b9c0d2',
    description: 'ID người dùng muốn tạo hoặc tìm cuộc trò chuyện 1-1',
  })
  @IsMongoId({ message: 'targetUserId phải là MongoId hợp lệ' })
  @IsNotEmpty({ message: 'targetUserId không được để trống' })
  targetUserId: string;
}

export class CreateGroupChatDto {
  @ApiProperty({
    example: 'Nhóm Dự Án Tốt Nghiệp',
    description: 'Tên của nhóm chat',
  })
  @IsString({ message: 'Tên nhóm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên nhóm không được để trống' })
  name: string;

  @ApiProperty({
    example: 'PRIVATE',
    enum: ['PUBLIC', 'PRIVATE'],
    description: 'Quyền riêng tư của nhóm chat',
  })
  @IsString()
  @IsNotEmpty({ message: 'privacy không được để trống' })
  privacy: string;

  @ApiProperty({
    example: ['65f1a2b3c4d5e6f7a8b9c0d2', '65f1a2b3c4d5e6f7a8b9c0d3'],
    description: 'Danh sách ID các thành viên tham gia nhóm (tối thiểu 2 người)',
  })
  @IsArray({ message: 'participantIds phải là mảng' })
  @IsMongoId({ each: true, message: 'Mỗi participantId phải là MongoId hợp lệ' })
  @ArrayMinSize(2, { message: 'Nhóm phải có ít nhất 2 thành viên khác ngoài người tạo' })
  participantIds: string[];
}

export class UpdateGroupNameDto {
  @ApiProperty({
    example: 'Nhóm Dự Án 2026',
    description: 'Tên nhóm mới',
  })
  @IsString({ message: 'name phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên nhóm không được để trống' })
  name: string;
}

export class UpdateGroupAvatarDto {
  @ApiProperty({
    example: 'http://localhost:3000/public/uploads/group.png',
    description: 'Đường dẫn URL ảnh đại diện nhóm mới',
  })
  @IsString({ message: 'avatarUrl phải là một chuỗi' })
  @IsNotEmpty({ message: 'avatarUrl không được để trống' })
  avatarUrl: string;
}