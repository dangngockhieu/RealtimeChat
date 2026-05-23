import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FriendshipService } from './friendship.service';
import { Friendship } from './schemas/friendship.schema';
import { FriendshipRepository } from './friendship.repository';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

interface FriendshipDocumentMock {
  _id?: Types.ObjectId;
  requester?: Types.ObjectId;
  recipient: Types.ObjectId;
  status: string;
  save?: jest.Mock;
}

interface PopulatedFriendshipMock {
  _id: Types.ObjectId;
  requester: {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
  };
  recipient: {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
  };
  status: string;
}

interface FriendshipModelMock {
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  findOneAndDelete: jest.Mock;
  findByIdAndDelete: jest.Mock;
}

interface FriendshipRepositoryMock {
  findFriendship: jest.Mock;
}

describe('FriendshipService', () => {
  let service: FriendshipService;
  let friendShipModel: FriendshipModelMock;
  let friendshipRepository: FriendshipRepositoryMock;

  const mockUserId = new Types.ObjectId().toString();
  const mockFriendId = new Types.ObjectId().toString();
  const mockFriendshipId = new Types.ObjectId().toString();

  beforeEach(async () => {
    function MockFriendshipInstance(this: FriendshipDocumentMock, data: Record<string, unknown>): void {
      Object.assign(this, data);
      this._id = new Types.ObjectId(mockFriendshipId);
      this.save = jest.fn().mockResolvedValue(this);
    }
    const friendshipModelMock = MockFriendshipInstance as unknown as FriendshipModelMock;
    friendshipModelMock.findById = jest.fn();
    friendshipModelMock.findOne = jest.fn();
    friendshipModelMock.find = jest.fn();
    friendshipModelMock.findOneAndDelete = jest.fn();
    friendshipModelMock.findByIdAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipService,
        {
          provide: getModelToken(Friendship.name),
          useValue: friendshipModelMock,
        },
        {
          provide: FriendshipRepository,
          useValue: {
            findFriendship: jest.fn(),
          } satisfies FriendshipRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<FriendshipService>(FriendshipService);
    friendShipModel = module.get(getModelToken(Friendship.name));
    friendshipRepository = module.get(FriendshipRepository);
  });

  describe('createFriendship', () => {
    it('nên ném BadRequestException nếu tự kết bạn với chính mình', async () => {
      await expect(service.createFriendship(mockUserId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên ném ForbiddenException nếu đang bị chặn', async () => {
      friendshipRepository.findFriendship.mockResolvedValue({ status: 'BLOCKED' });

      await expect(service.createFriendship(mockUserId, mockFriendId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('nên ném ConflictException nếu đã là bạn bè', async () => {
      friendshipRepository.findFriendship.mockResolvedValue({ status: 'ACCEPTED' });

      await expect(service.createFriendship(mockUserId, mockFriendId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('nên tạo lời mời kết bạn thành công', async () => {
      friendshipRepository.findFriendship.mockResolvedValue(null);

      const mockPopulated: PopulatedFriendshipMock = {
        _id: new Types.ObjectId(mockFriendshipId),
        requester: { _id: new Types.ObjectId(mockUserId), email: 'a@ex.com', firstName: 'A', lastName: 'B' },
        recipient: { _id: new Types.ObjectId(mockFriendId), email: 'b@ex.com', firstName: 'C', lastName: 'D' },
        status: 'PENDING',
      };

      friendShipModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockPopulated),
            }),
          }),
        }),
      });

      const result = await service.createFriendship(mockUserId, mockFriendId);
      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });
  });

  describe('acceptFriendship', () => {
    it('nên ném NotFoundException nếu lời mời không tồn tại', async () => {
      friendShipModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.acceptFriendship(mockUserId, mockFriendshipId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném ForbiddenException nếu không phải recipient', async () => {
      const mockDoc: FriendshipDocumentMock = {
        _id: new Types.ObjectId(mockFriendshipId),
        recipient: new Types.ObjectId(mockFriendId),
        status: 'PENDING',
        save: jest.fn(),
      };
      friendShipModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      await expect(service.acceptFriendship(mockUserId, mockFriendshipId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('nên chấp nhận lời mời kết bạn thành công', async () => {
      const mockDoc: FriendshipDocumentMock = {
        _id: new Types.ObjectId(mockFriendshipId),
        recipient: new Types.ObjectId(mockUserId),
        status: 'PENDING',
        save: jest.fn().mockResolvedValue(true),
      };
      friendShipModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      await service.acceptFriendship(mockUserId, mockFriendshipId);
      expect(mockDoc.status).toBe('ACCEPTED');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('blockFriendship', () => {
    it('nên ném BadRequestException nếu tự chặn bản thân', async () => {
      await expect(service.blockFriendship(mockUserId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên cập nhật status thành BLOCKED nếu đã tồn tại bản ghi', async () => {
      const mockDoc = {
        requester: new Types.ObjectId(mockUserId),
        recipient: new Types.ObjectId(mockFriendId),
        status: 'ACCEPTED',
        save: jest.fn().mockResolvedValue(true),
      };
      friendShipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      await service.blockFriendship(mockUserId, mockFriendId);
      expect(mockDoc.status).toBe('BLOCKED');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
