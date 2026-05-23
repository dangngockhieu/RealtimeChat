import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { UserAccount } from '../../response';

describe('MessageController', () => {
  let controller: MessageController;
  let service: MessageService;

  const mockUser: UserAccount = {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockMessageService = {
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    recallMessage: jest.fn(),
    deleteMessageForMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
      ],
    }).compile();

    controller = module.get<MessageController>(MessageController);
    service = module.get<MessageService>(MessageService);
  });

  it('nên gọi sendMessage trong MessageService', async () => {
    const dto = { conversationId: 'conv123', content: 'hello' };
    mockMessageService.sendMessage.mockResolvedValue({ id: 'msg123', content: 'hello' });

    const result = await controller.sendMessage(mockUser, dto);
    expect(service.sendMessage).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result.data).toBeDefined();
  });

  it('nên gọi getMessages trong MessageService', async () => {
    const dto = { limit: 10 };
    mockMessageService.getMessages.mockResolvedValue({ data: [], meta: { nextCursor: null, hasNextPage: false } });

    const result = await controller.getMessages(mockUser, 'conv123', dto);
    expect(service.getMessages).toHaveBeenCalledWith(mockUser.id, 'conv123', dto);
    expect(result.data).toEqual([]);
  });

  it('nên gọi recallMessage trong MessageService', async () => {
    mockMessageService.recallMessage.mockResolvedValue(undefined);

    const result = await controller.recallMessage(mockUser, 'msg123');
    expect(service.recallMessage).toHaveBeenCalledWith(mockUser.id, 'msg123');
    expect(result).toBeNull();
  });

  it('nên gọi deleteMessageForMe trong MessageService', async () => {
    mockMessageService.deleteMessageForMe.mockResolvedValue(undefined);

    const result = await controller.deleteMessageForMe(mockUser, 'msg123');
    expect(service.deleteMessageForMe).toHaveBeenCalledWith(mockUser.id, 'msg123');
    expect(result).toBeNull();
  });
});
