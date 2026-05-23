import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MessageService } from './message.service';
import { Message } from './schemas/message.schema';
import { Conversation } from '../conversation/schemas/conversation.schema';
import { Member } from '../member/schemas/member.schema';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

interface MockMessageDocument {
  _id: Types.ObjectId | string;
  createdAt: Date;
  save: jest.Mock;
  [key: string]: unknown;
}

interface MessageModelMock {
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  findByIdAndUpdate: jest.Mock;
}

interface ConversationModelMock {
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
}

interface MemberModelMock {
  findOne: jest.Mock;
  updateOne: jest.Mock;
  exists: jest.Mock;
}

describe('MessageService', () => {
  let service: MessageService;
  let messageModel: MessageModelMock;
  let conversationModel: ConversationModelMock;
  let memberModel: MemberModelMock;

  const mockUserId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();
  const mockMessageId = new Types.ObjectId().toString();

  beforeEach(async () => {
    function MockMessageInstance(this: MockMessageDocument, data: Record<string, unknown>): void {
      Object.assign(this, data);
      this._id = new Types.ObjectId();
      this.createdAt = new Date();
      this.save = jest.fn().mockResolvedValue(this);
    }
    const typedMessageModel = MockMessageInstance as typeof MockMessageInstance & MessageModelMock;
    typedMessageModel.findById = jest.fn();
    typedMessageModel.findOne = jest.fn();
    typedMessageModel.find = jest.fn();
    typedMessageModel.findByIdAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Message.name),
          useValue: typedMessageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Member.name),
          useValue: {
            findOne: jest.fn(),
            updateOne: jest.fn(),
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageModel = module.get(getModelToken(Message.name));
    conversationModel = module.get(getModelToken(Conversation.name));
    memberModel = module.get(getModelToken(Member.name));
  });

  describe('sendMessage', () => {
    it('nên ném lỗi NotFoundException nếu conversation không tồn tại', async () => {
      conversationModel.findById.mockResolvedValue(null);

      await expect(
        service.sendMessage(mockUserId, {
          conversationId: mockConversationId,
          content: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên ném lỗi ForbiddenException nếu user không phải thành viên', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, isActive: true });
      memberModel.findOne.mockResolvedValue(null);

      await expect(
        service.sendMessage(mockUserId, {
          conversationId: mockConversationId,
          content: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên ném lỗi BadRequestException nếu content và attachments đều rỗng', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, isActive: true });
      memberModel.findOne.mockResolvedValue({ userId: mockUserId, status: 'ACCEPTED' });

      await expect(
        service.sendMessage(mockUserId, {
          conversationId: mockConversationId,
          content: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên gửi tin nhắn thành công và cập nhật conversation', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, isActive: true });
      memberModel.findOne.mockResolvedValue({ userId: mockUserId, status: 'ACCEPTED' });
      conversationModel.findByIdAndUpdate.mockResolvedValue({});
      memberModel.updateOne.mockResolvedValue({});

      const mockPopulated = {
        _id: new Types.ObjectId(mockMessageId),
        conversationId: mockConversationId,
        senderId: {
          _id: new Types.ObjectId(mockUserId),
          firstName: 'An',
          lastName: 'Nguyễn',
          email: 'an@example.com',
        },
        content: 'Xin chào',
        type: 'TEXT',
        attachments: [],
        replyTo: null,
        isRecalled: false,
        createdAt: new Date(),
      };

      messageModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockPopulated),
            }),
          }),
        }),
      });

      const result = await service.sendMessage(mockUserId, {
        conversationId: mockConversationId,
        content: 'Xin chào',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Xin chào');
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('nên ném lỗi ForbiddenException nếu user không thuộc conversation', async () => {
      memberModel.findOne.mockResolvedValue(null);

      await expect(
        service.getMessages(mockUserId, mockConversationId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên lấy danh sách tin nhắn thành công', async () => {
      memberModel.findOne.mockResolvedValue({ userId: mockUserId, status: 'ACCEPTED' });

      const mockMessages = [
        {
          _id: new Types.ObjectId(),
          conversationId: mockConversationId,
          content: 'Tin 1',
          createdAt: new Date(),
        },
      ];

      messageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue(mockMessages),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMessages(mockUserId, mockConversationId, { limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });

  describe('recallMessage', () => {
    it('nên ném lỗi NotFoundException nếu tin nhắn không tồn tại', async () => {
      messageModel.findById.mockResolvedValue(null);

      await expect(service.recallMessage(mockUserId, mockMessageId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném lỗi BadRequestException nếu tin nhắn đã bị thu hồi trước đó', async () => {
      messageModel.findById.mockResolvedValue({
        _id: mockMessageId,
        isRecalled: true,
      });

      await expect(service.recallMessage(mockUserId, mockMessageId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên thu hồi tin nhắn thành công nếu là người gửi', async () => {
      const mockMsg = {
        _id: mockMessageId,
        conversationId: mockConversationId,
        senderId: mockUserId,
        isRecalled: false,
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      messageModel.findById.mockResolvedValue(mockMsg);
      memberModel.findOne.mockResolvedValue({ role: 'MEMBER' });

      await service.recallMessage(mockUserId, mockMessageId);

      expect(mockMsg.isRecalled).toBe(true);
      expect(mockMsg.save).toHaveBeenCalled();
    });
  });

  describe('deleteMessageForMe', () => {
    it('nên ném lỗi NotFoundException nếu tin nhắn không tồn tại', async () => {
      messageModel.findById.mockResolvedValue(null);

      await expect(service.deleteMessageForMe(mockUserId, mockMessageId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên xóa tin nhắn phía tôi thành công', async () => {
      messageModel.findById.mockResolvedValue({
        _id: mockMessageId,
        conversationId: mockConversationId,
      });
      memberModel.exists.mockResolvedValue(true);
      messageModel.findByIdAndUpdate.mockResolvedValue({});

      await service.deleteMessageForMe(mockUserId, mockMessageId);

      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockMessageId,
        expect.objectContaining({
          $addToSet: expect.any(Object),
        }),
      );
    });
  });
});
