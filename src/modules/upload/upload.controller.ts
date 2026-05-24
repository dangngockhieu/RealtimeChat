import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';

export const uploadDirectory = './public/uploads';
export const avatarUploadDirectory = './public/uploads/avatars';

// Đảm bảo thư mục lưu trữ tồn tại
if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, { recursive: true });
}
if (!existsSync(avatarUploadDirectory)) {
  mkdirSync(avatarUploadDirectory, { recursive: true });
}

export const multerStorage = diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname).toLowerCase();
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

export const avatarStorage = diskStorage({
  destination: avatarUploadDirectory,
  filename: (req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname).toLowerCase();
    callback(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

export const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    return callback(
      new BadRequestException('Định dạng ảnh không hợp lệ! Chỉ chấp nhận JPG, JPEG, PNG, GIF, WEBP'),
      false,
    );
  }
  callback(null, true);
};

@ApiTags('Upload')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'upload',
  version: '1',
})
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({
    summary: 'Tải lên 1 ảnh (Avatar, ảnh nhóm, ảnh tin nhắn)',
    description: 'Chấp nhận các định dạng ảnh: jpg, jpeg, png, gif, webp. Dung lượng tối đa: 5MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp hình ảnh cần tải lên',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Tải ảnh lên thành công, trả về URL của ảnh' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ResponseMessage('Tải lên ảnh thành công.')
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const data = this.uploadService.processSingleFile(file);
    return { data };
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Tải lên 1 ảnh đại diện (lưu vào thư mục public/uploads/avatars)',
    description: 'Chấp nhận các định dạng ảnh: jpg, jpeg, png, gif, webp. Dung lượng tối đa: 5MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp hình ảnh avatar cần tải lên',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Tải ảnh avatar lên thành công, trả về URL của ảnh' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ResponseMessage('Tải lên ảnh avatar thành công.')
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const data = this.uploadService.processAvatarFile(file);
    return { data };
  }

  @Post('files')
  @ApiOperation({
    summary: 'Tải lên nhiều tệp đính kèm (cho tin nhắn)',
    description: 'Chấp nhận tối đa 5 tệp tin cùng lúc (ảnh, tài liệu, pdf...). Dung lượng tối đa: 10MB mỗi file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Danh sách các tệp tin đính kèm',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Tải lên danh sách tệp tin thành công' })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: multerStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ResponseMessage('Tải lên danh sách tệp thành công.')
  uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    const data = this.uploadService.processMultipleFiles(files);
    return { data };
  }
}
