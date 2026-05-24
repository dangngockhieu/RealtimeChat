import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '../message/message.service';
import { MemberService } from '../member/member.service';
import { getModelToken } from '@nestjs/mongoose';
import { Member } from '../member/schemas/member.schema';
import { Types } from 'mongoose';
import { RedisService } from '../redis/redis.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: any;
  let configService: any;
  let messageService: any;
  let memberService: any;
  let memberModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();

  const mockServer = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };

  const mockRedisService: any = {
    addUserSocket: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    removeUserSocket: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    isUserOnline: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    getOnlineUserIds: jest.fn<() => Promise<string[]>>().mockResolvedValue([mockUserId]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: MessageService,
          useValue: {
            sendMessage: jest.fn(),
            recallMessage: jest.fn(),
          },
        },
        {
          provide: MemberService,
          useValue: {
            markAsRead: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: getModelToken(Member.name),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    messageService = module.get<MessageService>(MessageService);
    memberService = module.get<MemberService>(MemberService);
    memberModel = module.get(getModelToken(Member.name));

    gateway.server = mockServer as any;
  });

  describe('handleConnection', () => {
    it('nên từ chối kết nối nếu không có token', async () => {
      const mockClient: any = {
        id: 'socket1',
        handshake: { auth: {}, headers: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockClient);
      expect(mockClient.emit).toHaveBeenCalledWith('auth_error', expect.any(Object));
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('nên xác thực thành công và join vào các room', async () => {
      const mockClient: any = {
        id: 'socket1',
        handshake: { auth: { token: 'Bearer valid-token' } },
        data: {},
        join: jest.fn().mockResolvedValue(undefined as never),
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUserId,
        email: 'test@ex.com',
        role: 'USER',
      });

      memberModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { conversationId: new Types.ObjectId(mockConversationId) },
          ] as never),
        }),
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.data.user).toBeDefined();
      expect(mockClient.join).toHaveBeenCalledWith(`user_${mockUserId}`);
      expect(mockClient.join).toHaveBeenCalledWith(`conversation_${mockConversationId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('user_online', { userId: mockUserId });
    });
  });

  describe('handleDisconnect', () => {
    it('nên phát user_offline khi socket cuối cùng ngắt kết nối', async () => {
      mockRedisService.removeUserSocket.mockResolvedValue(true);

      const mockClient: any = {
        id: 'socket1',
        data: { user: { sub: mockUserId } },
      };

      await gateway.handleDisconnect(mockClient);
      expect(mockRedisService.removeUserSocket).toHaveBeenCalledWith(mockUserId, 'socket1');
      expect(mockServer.emit).toHaveBeenCalledWith('user_offline', { userId: mockUserId });
    });
  });

  describe('handleCheckOnline', () => {
    it('nên trả về danh sách onlineUserIds từ redisService', async () => {
      const mockClient: any = {};
      const result = await gateway.handleCheckOnline(mockClient, { userIds: [mockUserId] });
      expect(mockRedisService.getOnlineUserIds).toHaveBeenCalledWith([mockUserId]);
      expect(result.onlineUserIds).toEqual([mockUserId]);
    });
  });

  describe('handleSendMessage', () => {
    it('nên gọi messageService.sendMessage và broadcast new_message', async () => {
      const mockClient: any = {
        data: { user: { sub: mockUserId } },
      };

      const dto = { conversationId: mockConversationId, content: 'Xin chào' };
      const savedMessage = { id: 'msg1', content: 'Xin chào' };
      messageService.sendMessage.mockResolvedValue(savedMessage);

      const result = await gateway.handleSendMessage(mockClient, dto as any);

      expect(messageService.sendMessage).toHaveBeenCalledWith(mockUserId, dto);
      expect(mockServer.to).toHaveBeenCalledWith(`conversation_${mockConversationId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', savedMessage);
      expect(result.status).toBe('ok');
    });
  });

  describe('handleTyping', () => {
    it('nên phát sự kiện user_typing tới room conversation', () => {
      const mockClient: any = {
        data: { user: { sub: mockUserId } },
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      };

      gateway.handleTyping(mockClient, {
        conversationId: mockConversationId,
        isTyping: true,
      });

      expect(mockClient.to).toHaveBeenCalledWith(`conversation_${mockConversationId}`);
    });
  });

  describe('handleMarkRead', () => {
    it('nên gọi memberService.markAsRead và phát message_read tới room', async () => {
      const mockClient: any = {
        data: { user: { sub: mockUserId } },
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      };

      const dto = { conversationId: mockConversationId };
      memberService.markAsRead.mockResolvedValue(undefined);

      const result = await gateway.handleMarkRead(mockClient, dto);

      expect(memberService.markAsRead).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.status).toBe('ok');
    });
  });

  describe('handleRecallMessage', () => {
    it('nên gọi messageService.recallMessage và broadcast message_recalled', async () => {
      const mockClient: any = {
        data: { user: { sub: mockUserId } },
      };

      messageService.recallMessage.mockResolvedValue(undefined);

      const result = await gateway.handleRecallMessage(mockClient, {
        messageId: 'msg1',
        conversationId: mockConversationId,
      });

      expect(messageService.recallMessage).toHaveBeenCalledWith(mockUserId, 'msg1');
      expect(mockServer.to).toHaveBeenCalledWith(`conversation_${mockConversationId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('message_recalled', {
        conversationId: mockConversationId,
        messageId: 'msg1',
      });
      expect(result.status).toBe('ok');
    });
  });
});
