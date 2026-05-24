import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let service: UploadService;

  const mockUploadService = {
    processSingleFile: jest.fn(),
    processAvatarFile: jest.fn(),
    processMultipleFiles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    service = module.get<UploadService>(UploadService);
  });

  it('nên gọi processSingleFile khi uploadImage', () => {
    const mockFile: any = { filename: 'test.png' };
    mockUploadService.processSingleFile.mockReturnValue({ url: '/public/uploads/test.png' });

    const result = controller.uploadImage(mockFile);
    expect(service.processSingleFile).toHaveBeenCalledWith(mockFile);
    expect(result.data.url).toBe('/public/uploads/test.png');
  });

  it('nên gọi processAvatarFile khi uploadAvatar', () => {
    const mockFile: any = { filename: 'avatar.png' };
    mockUploadService.processAvatarFile.mockReturnValue({ url: '/public/uploads/avatars/avatar.png' });

    const result = controller.uploadAvatar(mockFile);
    expect(service.processAvatarFile).toHaveBeenCalledWith(mockFile);
    expect(result.data.url).toBe('/public/uploads/avatars/avatar.png');
  });

  it('nên gọi processMultipleFiles khi uploadMultipleFiles', () => {
    const mockFiles: any[] = [{ filename: 'test.png' }];
    mockUploadService.processMultipleFiles.mockReturnValue([{ url: '/public/uploads/test.png' }]);

    const result = controller.uploadMultipleFiles(mockFiles);
    expect(service.processMultipleFiles).toHaveBeenCalledWith(mockFiles);
    expect(result.data).toHaveLength(1);
  });
});
