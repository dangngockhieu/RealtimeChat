import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { BadRequestException } from '@nestjs/common';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('processSingleFile', () => {
    it('nên ném lỗi BadRequestException nếu không có file', () => {
      expect(() => service.processSingleFile(undefined)).toThrow(BadRequestException);
    });

    it('nên trả về thông tin file đã upload', () => {
      const mockFile: any = {
        filename: 'test-123.png',
        originalname: 'avatar.png',
        size: 1024,
        mimetype: 'image/png',
      };

      const result = service.processSingleFile(mockFile);
      expect(result.url).toBe('/public/uploads/test-123.png');
      expect(result.filename).toBe('test-123.png');
    });
  });

  describe('processMultipleFiles', () => {
    it('nên ném lỗi BadRequestException nếu danh sách files rỗng', () => {
      expect(() => service.processMultipleFiles([])).toThrow(BadRequestException);
    });

    it('nên trả về danh sách thông tin files', () => {
      const mockFiles: any[] = [
        {
          filename: 'f1.png',
          originalname: 'f1.png',
          size: 1024,
          mimetype: 'image/png',
        },
      ];

      const result = service.processMultipleFiles(mockFiles);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/public/uploads/f1.png');
    });
  });

  describe('processAvatarFile', () => {
    it('nên ném lỗi BadRequestException nếu không có file', () => {
      expect(() => service.processAvatarFile(undefined)).toThrow(BadRequestException);
    });

    it('nên trả về thông tin avatar đã upload với url /public/uploads/avatars/...', () => {
      const mockFile: any = {
        filename: 'avatar-123.png',
        originalname: 'my-avatar.png',
        size: 2048,
        mimetype: 'image/png',
      };

      const result = service.processAvatarFile(mockFile);
      expect(result.url).toBe('/public/uploads/avatars/avatar-123.png');
      expect(result.filename).toBe('avatar-123.png');
    });
  });

  describe('deleteFileByUrl', () => {
    it('nên trả về false nếu URL rỗng hoặc không hợp lệ', () => {
      expect(service.deleteFileByUrl('')).toBe(false);
      expect(service.deleteFileByUrl(null)).toBe(false);
      expect(service.deleteFileByUrl('https://google.com/image.png')).toBe(false);
    });

    it('nên trả về false nếu đường dẫn chứa path traversal ngoài thư mục uploads', () => {
      expect(service.deleteFileByUrl('/public/uploads/../../etc/passwd')).toBe(false);
    });
  });
});
