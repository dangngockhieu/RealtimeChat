jest.mock('api-query-params', () => () => ({ filter: {}, sort: {}, projection: {}, population: {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserAccount } from '../../response';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUser: UserAccount = {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockUserService = {
    updatePassword: jest.fn(),
    updateUserProfile: jest.fn(),
    getAllUsesrs: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    uploadAndChangeAvatar: jest.fn(),
    updateAvatar: jest.fn(),
    removeAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('nên gọi updatePassword', async () => {
    const dto = { oldPassword: 'old', newPassword: 'new', confirmPassword: 'new' };
    mockUserService.updatePassword.mockResolvedValue(undefined);

    const result = await controller.changePassword(dto, mockUser);
    expect(service.updatePassword).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toBeNull();
  });

  it('nên gọi updateProfile', async () => {
    const dto = { firstName: 'New' };
    mockUserService.updateUserProfile.mockResolvedValue({ id: mockUser.id, firstName: 'New' });

    const result = await controller.updateProfile(dto, mockUser);
    expect(service.updateUserProfile).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result.data.firstName).toBe('New');
  });

  it('nên gọi getALlUsers', async () => {
    mockUserService.getAllUsesrs.mockResolvedValue({ data: [], meta: { currentPage: 1 } });

    const result = await controller.getALlUsers('1', '10', '');
    expect(service.getAllUsesrs).toHaveBeenCalledWith(1, 10, '');
    expect(result.data).toEqual([]);
  });

  it('nên gọi getProfile', async () => {
    const result = await controller.getProfile(mockUser);
    expect(result.data).toEqual(mockUser);
  });

  it('nên gọi getUserById', async () => {
    mockUserService.getUserById.mockResolvedValue({ id: mockUser.id });

    const result = await controller.getUserById(mockUser.id);
    expect(service.getUserById).toHaveBeenCalledWith(mockUser.id);
    expect(result.data).toBeDefined();
  });

  it('nên gọi uploadAndChangeAvatar khi uploadAvatar', async () => {
    const mockFile: any = { filename: 'avatar-1.png' };
    mockUserService.uploadAndChangeAvatar.mockResolvedValue({ id: mockUser.id, avatar: '/public/uploads/avatars/avatar-1.png' });

    const result = await controller.uploadAvatar(mockFile, mockUser);
    expect(service.uploadAndChangeAvatar).toHaveBeenCalledWith(mockUser.id, mockFile);
    expect(result.data.avatar).toBe('/public/uploads/avatars/avatar-1.png');
  });

  it('nên gọi updateAvatar khi updateAvatar', async () => {
    mockUserService.updateAvatar.mockResolvedValue({ id: mockUser.id, avatar: 'http://avatar.png' });

    const result = await controller.updateAvatar({ avatarUrl: 'http://avatar.png' }, mockUser);
    expect(service.updateAvatar).toHaveBeenCalledWith(mockUser.id, 'http://avatar.png');
    expect(result.data.avatar).toBe('http://avatar.png');
  });

  it('nên gọi removeAvatar khi removeAvatar', async () => {
    mockUserService.removeAvatar.mockResolvedValue({ id: mockUser.id, avatar: null });

    const result = await controller.removeAvatar(mockUser);
    expect(service.removeAvatar).toHaveBeenCalledWith(mockUser.id);
    expect(result.data.avatar).toBeNull();
  });
});
