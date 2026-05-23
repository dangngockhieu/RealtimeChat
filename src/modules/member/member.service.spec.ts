import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { MemberService } from './member.service';
import { Member } from './schemas/member.schema';
import { Conversation } from '../conversation/schemas/conversation.schema';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

interface MockMemberDocument {
  _id: Types.ObjectId;
  role?: string;
  save: jest.Mock<Promise<MockMemberDocument>, []>;
  [key: string]: unknown;
}

interface MockMemberModel {
  new (data: Record<string, unknown>): MockMemberDocument;
  findOne: jest.Mock;
  find: jest.Mock;
  updateOne: jest.Mock;
  exists: jest.Mock;
  countDocuments: jest.Mock;
}

interface MockConversationModel {
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
}

interface MockSession {
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  abortTransaction: jest.Mock;
  endSession: jest.Mock;
}

interface MockConnection {
  startSession: jest.Mock<Promise<MockSession>, []>;
}

describe('MemberService', () => {
  let service: MemberService;
  let memberModel: MockMemberModel;
  let conversationModel: MockConversationModel;

  const mockOperatorId = new Types.ObjectId().toString();
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
    const MockMemberInstance = function (this: MockMemberDocument, data: Record<string, unknown>): void {
      Object.assign(this, data);
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
    } as unknown as MockMemberModel;
    MockMemberInstance.findOne = jest.fn();
    MockMemberInstance.find = jest.fn();
    MockMemberInstance.updateOne = jest.fn();
    MockMemberInstance.exists = jest.fn();
    MockMemberInstance.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getModelToken(Member.name),
          useValue: MockMemberInstance,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    memberModel = module.get(getModelToken(Member.name));
    conversationModel = module.get(getModelToken(Conversation.name));
  });

  describe('addMembers', () => {
    it('nên ném lỗi NotFoundException nếu nhóm không tồn tại', async () => {
      conversationModel.findById.mockResolvedValue(null);

      await expect(
        service.addMembers(mockOperatorId, {
          conversationId: mockConversationId,
          memberIds: [mockTargetId],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên ném lỗi ForbiddenException nếu operator không phải OWNER/ADMIN', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      memberModel.findOne.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        service.addMembers(mockOperatorId, {
          conversationId: mockConversationId,
          memberIds: [mockTargetId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên thêm thành viên thành công', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      memberModel.findOne.mockResolvedValue({ role: 'OWNER' });
      memberModel.find.mockResolvedValue([]);
      conversationModel.findByIdAndUpdate.mockResolvedValue({});

      await service.addMembers(mockOperatorId, {
        conversationId: mockConversationId,
        memberIds: [mockTargetId],
      });

      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('nên ném lỗi BadRequestException nếu tự xóa chính mình', async () => {
      await expect(
        service.removeMember(mockOperatorId, {
          conversationId: mockConversationId,
          targetUserId: mockOperatorId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên ném lỗi ForbiddenException nếu operator là MEMBER', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      memberModel.findOne
        .mockResolvedValueOnce({ role: 'MEMBER' }) // operator
        .mockResolvedValueOnce({ role: 'MEMBER' }); // target

      await expect(
        service.removeMember(mockOperatorId, {
          conversationId: mockConversationId,
          targetUserId: mockTargetId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên xóa thành viên thành công nếu operator là OWNER', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      const targetMock = { role: 'MEMBER', save: jest.fn().mockResolvedValue(true) };
      memberModel.findOne
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce(targetMock);
      conversationModel.findByIdAndUpdate.mockResolvedValue({});

      await service.removeMember(mockOperatorId, {
        conversationId: mockConversationId,
        targetUserId: mockTargetId,
      });

      expect(targetMock.save).toHaveBeenCalled();
    });
  });

  describe('leaveGroup', () => {
    it('nên ném lỗi BadRequestException nếu OWNER rời nhóm khi còn thành viên khác', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      memberModel.findOne.mockResolvedValue({ role: 'OWNER' });
      memberModel.countDocuments.mockResolvedValue(2);

      await expect(
        service.leaveGroup(mockOperatorId, { conversationId: mockConversationId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên rời nhóm thành công nếu là MEMBER', async () => {
      conversationModel.findById.mockResolvedValue({ _id: mockConversationId, type: 'GROUP', isActive: true });
      const memberMock = { role: 'MEMBER', save: jest.fn().mockResolvedValue(true) };
      memberModel.findOne.mockResolvedValue(memberMock);
      conversationModel.findByIdAndUpdate.mockResolvedValue({});

      await service.leaveGroup(mockOperatorId, { conversationId: mockConversationId });
      expect(memberMock.save).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('nên ném lỗi NotFoundException nếu không thuộc cuộc trò chuyện', async () => {
      memberModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.markAsRead(mockOperatorId, { conversationId: mockConversationId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên đánh dấu đã đọc thành công', async () => {
      memberModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await service.markAsRead(mockOperatorId, { conversationId: mockConversationId });
      expect(memberModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('clearChatHistory', () => {
    it('nên xóa lịch sử phía tôi thành công', async () => {
      memberModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await service.clearChatHistory(mockOperatorId, { conversationId: mockConversationId });
      expect(memberModel.updateOne).toHaveBeenCalled();
    });
  });
});
