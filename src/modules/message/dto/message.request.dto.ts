import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện' })
  @IsMongoId({ message: 'conversationId không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId không được để trống' })
  conversationId: string;

  @ApiPropertyOptional({ example: 'Xin chào mọi người!', description: 'Nội dung tin nhắn' })
  @IsOptional()
  @IsString({ message: 'content phải là chuỗi' })
  content?: string;

  @ApiPropertyOptional({ example: 'TEXT', enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'], description: 'Loại tin nhắn' })
  @IsOptional()
  @IsIn(['TEXT', 'IMAGE', 'FILE', 'SYSTEM'], { message: 'Loại tin nhắn không hợp lệ' })
  type?: string;

  @ApiPropertyOptional({ example: ['https://example.com/image.png'], description: 'Danh sách đường dẫn đính kèm' })
  @IsOptional()
  @IsArray({ message: 'attachments phải là mảng' })
  @IsString({ each: true, message: 'Mỗi đường dẫn đính kèm phải là chuỗi' })
  attachments?: string[];

  @ApiPropertyOptional({ example: '65f1a2b3c4d5e6f7a8b9c0d2', description: 'ID tin nhắn đang trả lời' })
  @IsOptional()
  @IsMongoId({ message: 'replyTo không hợp lệ' })
  replyTo?: string;
}

export class GetMessagesDto {
  @ApiPropertyOptional({ example: 20, default: 20, description: 'Số lượng tin nhắn cần lấy' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ example: '2026-10-01T15:00:00.000Z', description: 'Cursor mốc thời gian lấy các tin nhắn cũ hơn' })
  @IsOptional()
  @IsISO8601({}, { message: 'cursor phải là định dạng ISO8601' })
  cursor?: string;
}
