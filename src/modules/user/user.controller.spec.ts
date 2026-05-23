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
});
