import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { UserAccount } from '../../response';

describe('FriendshipController', () => {
  let controller: FriendshipController;
  let service: FriendshipService;

  const mockUser: UserAccount = {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockFriendshipService = {
    getFriendshipsForUser: jest.fn(),
    getPendingFriendRequests: jest.fn(),
    getBlockedUsers: jest.fn(),
    createFriendship: jest.fn(),
    blockFriendship: jest.fn(),
    unBlockFriendship: jest.fn(),
    removeSendFriendship: jest.fn(),
    removeFriendship: jest.fn(),
    acceptFriendship: jest.fn(),
    declineFriendship: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendshipController],
      providers: [
        {
          provide: FriendshipService,
          useValue: mockFriendshipService,
        },
      ],
    }).compile();

    controller = module.get<FriendshipController>(FriendshipController);
    service = module.get<FriendshipService>(FriendshipService);
  });

  it('nên gọi getFriendshipsForUser', async () => {
    mockFriendshipService.getFriendshipsForUser.mockResolvedValue([]);

    const result = await controller.getFriendships(mockUser);
    expect(service.getFriendshipsForUser).toHaveBeenCalledWith(mockUser.id);
    expect(result.data).toEqual([]);
  });

  it('nên gọi createFriendship', async () => {
    const dto = { friendId: 'friend123' };
    mockFriendshipService.createFriendship.mockResolvedValue({ id: 'f1' });

    const result = await controller.createFriendship(mockUser, dto);
    expect(service.createFriendship).toHaveBeenCalledWith(mockUser.id, dto.friendId);
    expect(result.data).toBeDefined();
  });

  it('nên gọi acceptFriendship', async () => {
    mockFriendshipService.acceptFriendship.mockResolvedValue(undefined);

    const result = await controller.acceptFriendship(mockUser, 'f1');
    expect(service.acceptFriendship).toHaveBeenCalledWith(mockUser.id, 'f1');
    expect(result).toBeNull();
  });

  it('nên gọi declineFriendship', async () => {
    mockFriendshipService.declineFriendship.mockResolvedValue(undefined);

    const result = await controller.declineFriendship(mockUser, 'f1');
    expect(service.declineFriendship).toHaveBeenCalledWith(mockUser.id, 'f1');
    expect(result).toBeNull();
  });
});
