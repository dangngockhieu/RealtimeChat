jest.mock('argon2');
jest.mock('api-query-params', () => () => ({ filter: {}, sort: {}, projection: {}, population: {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as argon from 'argon2';
import { UploadService } from '../upload/upload.service';

describe('UserService', () => {
  let service: UserService;
  let repository: any;
  let uploadService: any;

  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0d1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByIdWithPassword: jest.fn(),
            updatePassword: jest.fn(),
            updateProfile: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            count: jest.fn(),
            createUser: jest.fn(),
            updateRefreshToken: jest.fn(),
            updateAvatar: jest.fn(),
          },
        },
        {
          provide: UploadService,
          useValue: {
            processSingleFile: jest.fn(),
            processAvatarFile: jest.fn(),
            processMultipleFiles: jest.fn(),
            deleteFileByUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
    uploadService = module.get<UploadService>(UploadService);
  });

  describe('updatePassword', () => {
    it('nên ném BadRequestException nếu mật khẩu mới và xác nhận không khớp', async () => {
      await expect(
        service.updatePassword(mockUserId, {
          oldPassword: 'old',
          newPassword: 'new1',
          confirmPassword: 'new2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên ném NotFoundException nếu không tìm thấy người dùng', async () => {
      repository.findByIdWithPassword.mockResolvedValue(null);

      await expect(
        service.updatePassword(mockUserId, {
          oldPassword: 'old',
          newPassword: 'new',
          confirmPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên ném ForbiddenException nếu mật khẩu cũ không đúng', async () => {
      repository.findByIdWithPassword.mockResolvedValue({ password: 'hashed' });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updatePassword(mockUserId, {
          oldPassword: 'wrong',
          newPassword: 'new',
          confirmPassword: 'new',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên đổi mật khẩu thành công', async () => {
      repository.findByIdWithPassword.mockResolvedValue({ password: 'hashed' });
      (argon.verify as jest.Mock).mockResolvedValue(true);
      (argon.hash as jest.Mock).mockResolvedValue('newHashed');
      repository.updatePassword.mockResolvedValue(undefined);

      await service.updatePassword(mockUserId, {
        oldPassword: 'correct',
        newPassword: 'new',
        confirmPassword: 'new',
      });

      expect(repository.updatePassword).toHaveBeenCalledWith(mockUserId, 'newHashed');
    });
  });

  describe('getUserById', () => {
    it('nên ném NotFoundException nếu không tìm thấy user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getUserById(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('nên trả về UserResponseDto nếu tìm thấy', async () => {
      repository.findById.mockResolvedValue({
        _id: mockUserId,
        email: 'test@ex.com',
        firstName: 'An',
        lastName: 'Nguyen',
      });

      const result = await service.getUserById(mockUserId);
      expect(result).toBeDefined();
      expect(result.email).toBe('test@ex.com');
    });
  });

  describe('updateAvatar', () => {
    it('nên ném NotFoundException nếu không tìm thấy người dùng', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.updateAvatar(mockUserId, 'http://new.jpg')).rejects.toThrow(NotFoundException);
    });

    it('nên xóa avatar cũ nếu có và cập nhật avatar mới', async () => {
      repository.findById.mockResolvedValue({
        _id: mockUserId,
        avatar: '/public/uploads/avatars/old.jpg',
      });
      repository.updateAvatar.mockResolvedValue({
        _id: mockUserId,
        avatar: '/public/uploads/avatars/new.jpg',
      });

      const result = await service.updateAvatar(mockUserId, '/public/uploads/avatars/new.jpg');
      expect(uploadService.deleteFileByUrl).toHaveBeenCalledWith('/public/uploads/avatars/old.jpg');
      expect(repository.updateAvatar).toHaveBeenCalledWith(mockUserId, '/public/uploads/avatars/new.jpg');
      expect(result.avatar).toBe('/public/uploads/avatars/new.jpg');
    });
  });

  describe('uploadAndChangeAvatar', () => {
    it('nên ném BadRequestException nếu không truyền file', async () => {
      await expect(service.uploadAndChangeAvatar(mockUserId, undefined)).rejects.toThrow(BadRequestException);
    });

    it('nên xóa file vừa upload và ném NotFoundException nếu không tìm thấy user', async () => {
      const mockFile: any = { filename: 'avatar-123.jpg' };
      repository.findById.mockResolvedValue(null);

      await expect(service.uploadAndChangeAvatar(mockUserId, mockFile)).rejects.toThrow(NotFoundException);
      expect(uploadService.deleteFileByUrl).toHaveBeenCalledWith('/public/uploads/avatars/avatar-123.jpg');
    });

    it('nên xóa file cũ trên đĩa và cập nhật file mới', async () => {
      const mockFile: any = { filename: 'avatar-new.jpg' };
      repository.findById.mockResolvedValue({
        _id: mockUserId,
        avatar: '/public/uploads/avatars/avatar-old.jpg',
      });
      repository.updateAvatar.mockResolvedValue({
        _id: mockUserId,
        avatar: '/public/uploads/avatars/avatar-new.jpg',
      });

      const result = await service.uploadAndChangeAvatar(mockUserId, mockFile);
      expect(uploadService.deleteFileByUrl).toHaveBeenCalledWith('/public/uploads/avatars/avatar-old.jpg');
      expect(repository.updateAvatar).toHaveBeenCalledWith(mockUserId, '/public/uploads/avatars/avatar-new.jpg');
      expect(result.avatar).toBe('/public/uploads/avatars/avatar-new.jpg');
    });
  });

  describe('removeAvatar', () => {
    it('nên ném NotFoundException nếu không tìm thấy người dùng', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.removeAvatar(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('nên xóa file avatar cũ trên đĩa và cập nhật avatar thành null trong DB', async () => {
      repository.findById.mockResolvedValue({
        _id: mockUserId,
        avatar: '/public/uploads/avatars/to-delete.jpg',
      });
      repository.updateAvatar.mockResolvedValue({
        _id: mockUserId,
        avatar: null,
      });

      const result = await service.removeAvatar(mockUserId);
      expect(uploadService.deleteFileByUrl).toHaveBeenCalledWith('/public/uploads/avatars/to-delete.jpg');
      expect(repository.updateAvatar).toHaveBeenCalledWith(mockUserId, null);
      expect(result.avatar).toBeNull();
    });
  });
});
