import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { UserAccount } from '../../response';

describe('ConversationController', () => {
  let controller: ConversationController;
  let service: ConversationService;

  const mockUser: UserAccount = {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockConversationService = {
    createGroupChat: jest.fn(),
    findOrCreateDirectChat: jest.fn(),
    getMyConversations: jest.fn(),
    getConversationDetail: jest.fn(),
    updateGroupName: jest.fn(),
    disbandGroup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
    service = module.get<ConversationService>(ConversationService);
  });

  it('nên gọi createGroupChat', async () => {
    const dto = { name: 'Nhóm', privacy: 'PRIVATE', participantIds: ['user2', 'user3'] };
    mockConversationService.createGroupChat.mockResolvedValue({ id: 'conv1' });

    const result = await controller.createGroupChat(mockUser, dto);
    expect(service.createGroupChat).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result.data).toBeDefined();
  });

  it('nên gọi createDirectChat', async () => {
    const dto = { targetUserId: 'user2' };
    mockConversationService.findOrCreateDirectChat.mockResolvedValue({ id: 'conv1' });

    const result = await controller.createDirectChat(mockUser, dto);
    expect(service.findOrCreateDirectChat).toHaveBeenCalledWith(mockUser.id, dto.targetUserId);
    expect(result.data).toBeDefined();
  });

  it('nên gọi getMyConversations', async () => {
    mockConversationService.getMyConversations.mockResolvedValue({
      result: [],
      nextCursor: null,
      hasNextPage: false,
    });

    const result = await controller.getMyConversations(mockUser, 20);
    expect(service.getMyConversations).toHaveBeenCalledWith(mockUser.id, 20, undefined);
    expect(result.data).toEqual([]);
  });

  it('nên gọi getConversationDetail', async () => {
    mockConversationService.getConversationDetail.mockResolvedValue({ id: 'conv1' });

    const result = await controller.getConversationDetail(mockUser, 'conv1');
    expect(service.getConversationDetail).toHaveBeenCalledWith('conv1', mockUser.id);
    expect(result.data).toBeDefined();
  });

  it('nên gọi updateGroupName', async () => {
    mockConversationService.updateGroupName.mockResolvedValue(undefined);

    const result = await controller.updateGroupName(mockUser, 'conv1', { name: 'New Name' });
    expect(service.updateGroupName).toHaveBeenCalledWith('conv1', mockUser.id, 'New Name');
    expect(result).toBeNull();
  });

  it('nên gọi disbandGroup', async () => {
    mockConversationService.disbandGroup.mockResolvedValue(undefined);

    const result = await controller.disbandGroup(mockUser, 'conv1');
    expect(service.disbandGroup).toHaveBeenCalledWith('conv1', mockUser.id);
    expect(result).toBeNull();
  });
});
