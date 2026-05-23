import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ConversationService } from './conversation.service';
import { Conversation } from './schemas/conversation.schema';
import { Message } from '../message/schemas/message.schema';
import { Member } from '../member/schemas/member.schema';
import { Types } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';

interface MockSession {
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  abortTransaction: jest.Mock;
  endSession: jest.Mock;
}

interface MockConnection {
  startSession: jest.Mock<Promise<MockSession>, []>;
}

interface MockConversationDocument {
  [key: string]: unknown;
  _id: Types.ObjectId;
  save: jest.Mock;
}

interface MockConversationModel {
  new (data: Record<string, unknown>): MockConversationDocument;
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
}

interface MockMessageModel {
  countDocuments: jest.Mock;
}

interface MockMemberModel {
  find: jest.Mock;
  findOne: jest.Mock;
  insertMany: jest.Mock;
  aggregate: jest.Mock;
  exists: jest.Mock;
}

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationModel: MockConversationModel;
  let messageModel: MockMessageModel;
  let memberModel: MockMemberModel;

  const mockUserId = new Types.ObjectId().toString();
  const mockTargetId = new Types.ObjectId().toString();
  const mockConversationId = new Types.ObjectId().toString();

  const mockSession: MockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection: MockConnection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  beforeEach(async () => {
    function MockConversationInstance(this: MockConversationDocument, data: Record<string, unknown>): void {
      Object.assign(this, data);
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
    }
    const typedConversationModel = MockConversationInstance as unknown as MockConversationModel;
    typedConversationModel.findById = jest.fn();
    typedConversationModel.findOne = jest.fn();
    typedConversationModel.find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getModelToken(Conversation.name),
          useValue: MockConversationInstance,
        },
        {
          provide: getModelToken(Message.name),
          useValue: {
            countDocuments: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: getModelToken(Member.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            insertMany: jest.fn(),
            aggregate: jest.fn(),
            exists: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    conversationModel = module.get<MockConversationModel>(getModelToken(Conversation.name));
    messageModel = module.get<MockMessageModel>(getModelToken(Message.name));
    memberModel = module.get<MockMemberModel>(getModelToken(Member.name));
  });

  describe('createGroupChat', () => {
    it('nên tạo nhóm chat thành công và trả về ConversationDetailResponseDto', async () => {
      memberModel.insertMany.mockResolvedValue([]);
      memberModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                userId: { _id: new Types.ObjectId(mockUserId), firstName: 'A', lastName: 'B', role: 'USER' },
                role: 'OWNER',
              },
            ]),
          }),
        }),
      });

      const result = await service.createGroupChat(mockUserId, {
        name: 'Nhóm Test',
        privacy: 'PRIVATE',
        participantIds: [mockTargetId, new Types.ObjectId().toString()],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Nhóm Test');
      expect(result.type).toBe('GROUP');
    });
  });

  describe('getMyConversations', () => {
    it('nên trả về danh sách cuộc trò chuyện của tôi', async () => {
      memberModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ conversationId: new Types.ObjectId(mockConversationId) }]),
        }),
      });

      conversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: new Types.ObjectId(mockConversationId), name: 'Conv 1', lastMessageAt: new Date() },
            ]),
          }),
        }),
      });

      const result = await service.getMyConversations(mockUserId, 10);
      expect(result.result).toHaveLength(1);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('updateGroupName', () => {
    it('nên ném lỗi nếu không tìm thấy nhóm', async () => {
      conversationModel.findById.mockResolvedValue(null);

      await expect(
        service.updateGroupName(mockConversationId, mockUserId, 'Tên mới'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('nên cập nhật tên nhóm thành công nếu là OWNER', async () => {
      const mockConv = {
        _id: mockConversationId,
        type: 'GROUP',
        isActive: true,
        name: 'Tên cũ',
        save: jest.fn().mockResolvedValue(true),
      };
      conversationModel.findById.mockResolvedValue(mockConv);
      memberModel.findOne.mockResolvedValue({ role: 'OWNER' });

      await service.updateGroupName(mockConversationId, mockUserId, 'Tên mới');
      expect(mockConv.name).toBe('Tên mới');
      expect(mockConv.save).toHaveBeenCalled();
    });
  });

  describe('disbandGroup', () => {
    it('nên ném lỗi nếu không phải OWNER', async () => {
      conversationModel.findById.mockResolvedValue({
        _id: mockConversationId,
        type: 'GROUP',
        isActive: true,
      });
      memberModel.findOne.mockResolvedValue({ role: 'MEMBER' });

      await expect(service.disbandGroup(mockConversationId, mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('nên giải tán nhóm thành công nếu là OWNER', async () => {
      const mockConv = {
        _id: mockConversationId,
        type: 'GROUP',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      conversationModel.findById.mockResolvedValue(mockConv);
      memberModel.findOne.mockResolvedValue({ role: 'OWNER' });

      await service.disbandGroup(mockConversationId, mockUserId);
      expect(mockConv.isActive).toBe(false);
      expect(mockConv.save).toHaveBeenCalled();
    });
  });
});
