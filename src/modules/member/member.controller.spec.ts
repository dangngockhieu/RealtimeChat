import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { UserAccount } from '../../response';

describe('MemberController', () => {
  let controller: MemberController;
  let service: MemberService;

  const mockUser: UserAccount = {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockMemberService = {
    addMembers: jest.fn(),
    removeMember: jest.fn(),
    leaveGroup: jest.fn(),
    updateMemberRole: jest.fn(),
    transferOwner: jest.fn(),
    markAsRead: jest.fn(),
    clearChatHistory: jest.fn(),
    getMembers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
      ],
    }).compile();

    controller = module.get<MemberController>(MemberController);
    service = module.get<MemberService>(MemberService);
  });

  it('nên gọi addMembers', async () => {
    const dto = { conversationId: 'conv1', memberIds: ['user2'] };
    mockMemberService.addMembers.mockResolvedValue(undefined);

    const result = await controller.addMembers(mockUser, dto);
    expect(service.addMembers).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toBeNull();
  });

  it('nên gọi removeMember', async () => {
    const dto = { conversationId: 'conv1', targetUserId: 'user2' };
    mockMemberService.removeMember.mockResolvedValue(undefined);

    const result = await controller.removeMember(mockUser, dto);
    expect(service.removeMember).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toBeNull();
  });

  it('nên gọi leaveGroup', async () => {
    const dto = { conversationId: 'conv1' };
    mockMemberService.leaveGroup.mockResolvedValue(undefined);

    const result = await controller.leaveGroup(mockUser, dto);
    expect(service.leaveGroup).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toBeNull();
  });

  it('nên gọi markAsRead', async () => {
    const dto = { conversationId: 'conv1' };
    mockMemberService.markAsRead.mockResolvedValue(undefined);

    const result = await controller.markAsRead(mockUser, dto);
    expect(service.markAsRead).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toBeNull();
  });

  it('nên gọi getMembers', async () => {
    mockMemberService.getMembers.mockResolvedValue([]);

    const result = await controller.getMembers(mockUser, 'conv1');
    expect(service.getMembers).toHaveBeenCalledWith(mockUser.id, 'conv1');
    expect(result.data).toEqual([]);
  });
});
