import { ArrayNotEmpty, IsArray, IsIn, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMembersDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiProperty({ example: ['65f1a2b3c4d5e6f7a8b9c0d2'], description: 'Danh sách ID người dùng cần thêm vào nhóm' })
  @IsArray({ message: 'memberIds phải là mảng' })
  @ArrayNotEmpty({ message: 'memberIds không được để trống' })
  @IsMongoId({ each: true, message: 'Mỗi memberId phải là MongoId hợp lệ' })
  memberIds: string[];
}

export class RemoveMemberDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d2', description: 'ID người dùng cần xóa khỏi nhóm' })
  @IsMongoId({ message: 'targetUserId không hợp lệ' })
  @IsNotEmpty({ message: 'targetUserId không được để trống' })
  targetUserId: string;
}

export class UpdateRoleDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d2', description: 'ID người dùng cần đổi vai trò' })
  @IsMongoId({ message: 'targetUserId không hợp lệ' })
  @IsNotEmpty({ message: 'targetUserId không được để trống' })
  targetUserId: string;

  @ApiProperty({ example: 'ADMIN', enum: ['ADMIN', 'MEMBER'], description: 'Vai trò mới' })
  @IsIn(['ADMIN', 'MEMBER'], { message: 'Vai trò chỉ có thể là ADMIN hoặc MEMBER' })
  @IsNotEmpty({ message: 'role không được để trống' })
  role: 'ADMIN' | 'MEMBER';
}

export class TransferOwnerDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d2', description: 'ID người dùng nhận quyền OWNER' })
  @IsMongoId({ message: 'newOwnerId không hợp lệ' })
  @IsNotEmpty({ message: 'newOwnerId không được để trống' })
  newOwnerId: string;
}

export class LeaveGroupDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm muốn rời' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;
}

export class MarkAsReadDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện đã đọc' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiPropertyOptional({ example: '65f1a2b3c4d5e6f7a8b9c0d3', description: 'ID tin nhắn cuối cùng đã đọc' })
  @IsOptional()
  @IsMongoId({ message: 'messageId không hợp lệ' })
  messageId?: string;
}

export class ClearHistoryDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện muốn xóa lịch sử' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;
}
