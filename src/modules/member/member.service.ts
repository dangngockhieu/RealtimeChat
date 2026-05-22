import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Member, MemberDocument } from './schemas/member.schema';
import { Conversation, ConversationDocument } from '../conversation/schemas/conversation.schema';
import {
  AddMembersDto,
  ClearHistoryDto,
  LeaveGroupDto,
  MarkAsReadDto,
  RemoveMemberDto,
  TransferOwnerDto,
  UpdateRoleDto,
} from './dto/member.request.dto';
import { MemberResponseDto } from '../../response';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // Thêm thành viên vào nhóm chat
  async addMembers(operatorId: string, dto: AddMembersDto): Promise<void> {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation || !conversation.isActive) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại hoặc đã bị giải tán');
    }
    if (conversation.type !== 'GROUP') {
      throw new BadRequestException('Không thể thêm thành viên vào cuộc trò chuyện 1-1');
    }

    // Kiểm tra quyền của người thêm: OWNER hoặc ADMIN
    const operator = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId: operatorId,
      status: 'ACCEPTED',
    });
    if (!operator || (operator.role !== 'OWNER' && operator.role !== 'ADMIN')) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Trưởng nhóm mới có quyền thêm thành viên');
    }

    // Loại bỏ operatorId và các ID trùng lặp khỏi danh sách thêm
    const uniqueMemberIds = Array.from(new Set(dto.memberIds.filter(id => id !== operatorId)));
    if (uniqueMemberIds.length === 0) {
      throw new BadRequestException('Danh sách thành viên cần thêm không hợp lệ');
    }

    // Lấy thông tin các thành viên đã có trong conversation
    const existingMembers = await this.memberModel.find({
      conversationId: dto.conversationId,
      userId: { $in: uniqueMemberIds.map(id => new Types.ObjectId(id)) },
    });

    const existingMap = new Map(existingMembers.map(m => [m.userId.toString(), m]));
    let newlyAddedCount = 0;

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      for (const targetId of uniqueMemberIds) {
        const existing = existingMap.get(targetId);
        if (existing) {
          if (existing.status === 'ACCEPTED') {
            continue; // Đã là thành viên, bỏ qua
          }
          // Từng rời nhóm hoặc bị xóa -> kích hoạt lại
          existing.status = 'ACCEPTED';
          existing.role = 'MEMBER';
          existing.leftAt = null;
          existing.joinedAt = new Date();
          await existing.save({ session });
          newlyAddedCount++;
        } else {
          // Thêm mới hoàn toàn
          const newMember = new this.memberModel({
            conversationId: new Types.ObjectId(dto.conversationId),
            userId: new Types.ObjectId(targetId),
            role: 'MEMBER',
            status: 'ACCEPTED',
            joinedAt: new Date(),
          });
          await newMember.save({ session });
          newlyAddedCount++;
        }
      }

      if (newlyAddedCount > 0) {
        await this.conversationModel.findByIdAndUpdate(
          dto.conversationId,
          { $inc: { memberCount: newlyAddedCount } },
          { session },
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Lỗi trong quá trình thêm thành viên');
    } finally {
      await session.endSession();
    }
  }

  // Xóa thành viên khỏi nhóm
  async removeMember(operatorId: string, dto: RemoveMemberDto): Promise<void> {
    if (operatorId === dto.targetUserId) {
      throw new BadRequestException('Không thể tự xóa bản thân bằng chức năng này. Vui lòng dùng rời nhóm.');
    }

    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation || !conversation.isActive) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }
    if (conversation.type !== 'GROUP') {
      throw new BadRequestException('Thao tác chỉ áp dụng cho nhóm chat');
    }

    const [operator, target] = await Promise.all([
      this.memberModel.findOne({
        conversationId: dto.conversationId,
        userId: operatorId,
        status: 'ACCEPTED',
      }),
      this.memberModel.findOne({
        conversationId: dto.conversationId,
        userId: dto.targetUserId,
        status: 'ACCEPTED',
      }),
    ]);

    if (!operator) {
      throw new ForbiddenException('Bạn không thuộc nhóm này');
    }
    if (!target) {
      throw new NotFoundException('Thành viên cần xóa không còn trong nhóm');
    }

    // Kiểm tra phân quyền:
    // OWNER có thể xóa ADMIN và MEMBER
    // ADMIN chỉ có thể xóa MEMBER
    if (operator.role === 'MEMBER') {
      throw new ForbiddenException('Bạn không có quyền xóa thành viên khỏi nhóm');
    }
    if (operator.role === 'ADMIN' && (target.role === 'OWNER' || target.role === 'ADMIN')) {
      throw new ForbiddenException('Quản trị viên không thể xóa Quản trị viên khác hoặc Trưởng nhóm');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      target.status = 'REMOVED';
      target.leftAt = new Date();
      await target.save({ session });

      await this.conversationModel.findByIdAndUpdate(
        dto.conversationId,
        { $inc: { memberCount: -1 } },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Không thể xóa thành viên khỏi nhóm');
    } finally {
      await session.endSession();
    }
  }

  // Rời nhóm
  async leaveGroup(userId: string, dto: LeaveGroupDto): Promise<void> {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation || !conversation.isActive) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }
    if (conversation.type !== 'GROUP') {
      throw new BadRequestException('Thao tác chỉ áp dụng cho nhóm chat');
    }

    const member = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId,
      status: 'ACCEPTED',
    });

    if (!member) {
      throw new NotFoundException('Bạn không còn là thành viên của nhóm này');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      if (member.role === 'OWNER') {
        // Đếm số thành viên khác đang active
        const remainingCount = await this.memberModel.countDocuments({
          conversationId: dto.conversationId,
          userId: { $ne: userId },
          status: 'ACCEPTED',
        });

        if (remainingCount > 0) {
          throw new BadRequestException('Bạn là Trưởng nhóm, vui lòng chuyển quyền Trưởng nhóm trước khi rời nhóm');
        } else {
          // Nhóm chỉ còn 1 người duy nhất rời -> Giải tán nhóm
          conversation.isActive = false;
          conversation.memberCount = 0;
          await conversation.save({ session });

          member.status = 'LEFT';
          member.leftAt = new Date();
          await member.save({ session });

          await session.commitTransaction();
          return;
        }
      }

      // MEMBER hoặc ADMIN rời nhóm bình thường
      member.status = 'LEFT';
      member.leftAt = new Date();
      await member.save({ session });

      await this.conversationModel.findByIdAndUpdate(
        dto.conversationId,
        { $inc: { memberCount: -1 } },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Lỗi khi rời nhóm');
    } finally {
      await session.endSession();
    }
  }

  // Thay đổi quyền hạn (ADMIN / MEMBER)
  async updateMemberRole(operatorId: string, dto: UpdateRoleDto): Promise<void> {
    if (operatorId === dto.targetUserId) {
      throw new BadRequestException('Không thể tự thay đổi vai trò của bản thân');
    }

    const operator = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId: operatorId,
      status: 'ACCEPTED',
    });

    if (!operator || operator.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ Trưởng nhóm mới có quyền bổ nhiệm hoặc hạ quyền Quản trị viên');
    }

    const target = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId: dto.targetUserId,
      status: 'ACCEPTED',
    });

    if (!target) {
      throw new NotFoundException('Thành viên không tồn tại trong nhóm');
    }

    target.role = dto.role;
    await target.save();
  }

  // Chuyển giao quyền Trưởng nhóm (OWNER)
  async transferOwner(operatorId: string, dto: TransferOwnerDto): Promise<void> {
    if (operatorId === dto.newOwnerId) {
      throw new BadRequestException('Bạn đã là Trưởng nhóm hiện tại');
    }

    const operator = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId: operatorId,
      status: 'ACCEPTED',
    });

    if (!operator || operator.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ Trưởng nhóm mới có quyền chuyển nhượng nhóm');
    }

    const newOwner = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId: dto.newOwnerId,
      status: 'ACCEPTED',
    });

    if (!newOwner) {
      throw new NotFoundException('Thành viên nhận quyền không tồn tại trong nhóm');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      newOwner.role = 'OWNER';
      operator.role = 'ADMIN'; // Chuyển chủ cũ xuống làm ADMIN

      await newOwner.save({ session });
      await operator.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Lỗi khi chuyển giao quyền Trưởng nhóm');
    } finally {
      await session.endSession();
    }
  }

  // Đánh dấu đã đọc tin nhắn
  async markAsRead(userId: string, dto: MarkAsReadDto): Promise<void> {
    const updateData: any = {
      lastReadAt: new Date(),
    };
    if (dto.messageId) {
      updateData.lastReadMessageId = new Types.ObjectId(dto.messageId);
    }

    const result = await this.memberModel.updateOne(
      {
        conversationId: dto.conversationId,
        userId,
        status: 'ACCEPTED',
      },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Thành viên không thuộc cuộc trò chuyện này');
    }
  }

  // Xóa lịch sử trò chuyện phía tôi
  async clearChatHistory(userId: string, dto: ClearHistoryDto): Promise<void> {
    const result = await this.memberModel.updateOne(
      {
        conversationId: dto.conversationId,
        userId,
        status: 'ACCEPTED',
      },
      { $set: { clearedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Thành viên không thuộc cuộc trò chuyện này');
    }
  }

  // Lấy danh sách thành viên trong cuộc trò chuyện
  async getMembers(userId: string, conversationId: string): Promise<MemberResponseDto[]> {
    // Kiểm tra người gọi API có phải thành viên không
    const isMember = await this.memberModel.exists({
      conversationId,
      userId,
      status: 'ACCEPTED',
    });

    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    const members = await this.memberModel
      .find({
        conversationId,
        status: 'ACCEPTED',
      })
      .populate('userId', 'firstName lastName email')
      .lean()
      .exec();

    return members.map(m =>
      plainToInstance(MemberResponseDto, m, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
