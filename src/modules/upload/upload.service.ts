import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface UploadFileResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  processSingleFile(file?: Express.Multer.File): UploadFileResponse {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp để tải lên');
    }

    return {
      url: `/public/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  processAvatarFile(file?: Express.Multer.File): UploadFileResponse {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện để tải lên');
    }

    return {
      url: `/public/uploads/avatars/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  processMultipleFiles(files?: Express.Multer.File[]): UploadFileResponse[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một tệp để tải lên');
    }

    return files.map(file => ({
      url: `/public/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  /**
   * Xóa file trên đĩa dựa vào URL hoặc đường dẫn lưu trữ.
   * Ngăn chặn path traversal bằng cách kiểm tra base directory public/uploads.
   */
  deleteFileByUrl(fileUrl?: string | null): boolean {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return false;
    }

    try {
      const matchIndex = fileUrl.indexOf('/public/uploads/');
      if (matchIndex === -1) {
        return false;
      }

      const relativeUploadPath = fileUrl.substring(matchIndex + '/public/'.length); // uploads/...
      const basePath = join(process.cwd(), 'public', 'uploads');
      const targetFilePath = join(process.cwd(), 'public', relativeUploadPath);

      // Đảm bảo targetFilePath nằm trong basePath (tránh path traversal)
      if (!targetFilePath.startsWith(basePath)) {
        this.logger.warn(`Phát hiện đường dẫn không an toàn khi xóa file: ${fileUrl}`);
        return false;
      }

      if (existsSync(targetFilePath)) {
        unlinkSync(targetFilePath);
        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error(`Lỗi khi xóa file ${fileUrl}: ${error?.message || error}`);
      return false;
    }
  }
}
