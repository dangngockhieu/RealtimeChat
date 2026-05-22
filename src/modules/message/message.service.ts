import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversation/schemas/conversation.schema';
import { Member, MemberDocument } from '../member/schemas/member.schema';
import { GetMessagesDto, SendMessageDto } from './dto/message.request.dto';
import { MessageResponseDto, MessagesListResponseDto } from '../../response';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
  ) {}

  // Gửi tin nhắn mới
  async sendMessage(userId: string, dto: SendMessageDto): Promise<MessageResponseDto> {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation || !conversation.isActive) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại hoặc đã bị giải tán');
    }

    // Kiểm tra người gửi có phải là thành viên hợp lệ
    const member = await this.memberModel.findOne({
      conversationId: dto.conversationId,
      userId,
      status: 'ACCEPTED',
    });
    if (!member) {
      throw new ForbiddenException('Bạn không phải là thành viên của cuộc trò chuyện này');
    }

    const content = dto.content?.trim() || '';
    const attachments = dto.attachments || [];

    if (!content && attachments.length === 0) {
      throw new BadRequestException('Tin nhắn phải có nội dung hoặc tệp đính kèm');
    }

    // Kiểm tra tin nhắn trả lời nếu có
    if (dto.replyTo) {
      const parentMessage = await this.messageModel.findOne({
        _id: dto.replyTo,
        conversationId: dto.conversationId,
      });
      if (!parentMessage) {
        throw new NotFoundException('Tin nhắn trả lời không tồn tại trong cuộc trò chuyện này');
      }
    }

    // Tạo tin nhắn mới
    const message = new this.messageModel({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: new Types.ObjectId(userId),
      content,
      type: dto.type || 'TEXT',
      attachments,
      replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : null,
    });

    const savedMessage = await message.save();

    // Cập nhật lastMessage và lastMessageAt của conversation
    await this.conversationModel.findByIdAndUpdate(dto.conversationId, {
      lastMessage: savedMessage._id,
      lastMessageAt: (savedMessage as any).createdAt,
    });

    // Cập nhật trạng thái đọc của chính người gửi
    await this.memberModel.updateOne(
      { conversationId: dto.conversationId, userId },
      {
        $set: {
          lastReadAt: (savedMessage as any).createdAt,
          lastReadMessageId: savedMessage._id,
        },
      },
    );

    // Populate dữ liệu để trả về response đầy đủ
    const populated = await this.messageModel
      .findById(savedMessage._id)
      .populate('senderId', '_id firstName lastName email')
      .populate({
        path: 'replyTo',
        select: '_id content isRecalled senderId',
        populate: { path: 'senderId', select: '_id firstName lastName' },
      })
      .lean()
      .exec();

    return this.transformMessage(populated);
  }

  // Lấy danh sách tin nhắn theo cursor pagination
  async getMessages(
    userId: string,
    conversationId: string,
    dto: GetMessagesDto,
  ): Promise<MessagesListResponseDto> {
    const member = await this.memberModel.findOne({
      conversationId,
      userId,
      status: 'ACCEPTED',
    });
    if (!member) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    const filter: any = {
      conversationId: new Types.ObjectId(conversationId),
      deletedBy: { $ne: new Types.ObjectId(userId) },
    };

    if (member.clearedAt) {
      filter.createdAt = { $gt: member.clearedAt };
    }

    if (dto.cursor) {
      const cursorDate = new Date(dto.cursor);
      if (filter.createdAt) {
        filter.createdAt = { ...filter.createdAt, $lt: cursorDate };
      } else {
        filter.createdAt = { $lt: cursorDate };
      }
    }

    const limit = dto.limit || 20;

    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('senderId', '_id firstName lastName email')
      .populate({
        path: 'replyTo',
        select: '_id content isRecalled senderId',
        populate: { path: 'senderId', select: '_id firstName lastName' },
      })
      .lean()
      .exec();

    const hasNextPage = messages.length > limit;
    const dataList = hasNextPage ? messages.slice(0, limit) : messages;
    const nextCursor = hasNextPage ? (dataList[dataList.length - 1] as any).createdAt : null;

    const data = dataList.map(msg => this.transformMessage(msg));

    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  // Thu hồi tin nhắn
  async recallMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.isRecalled) {
      throw new BadRequestException('Tin nhắn đã được thu hồi trước đó');
    }

    const member = await this.memberModel.findOne({
      conversationId: message.conversationId,
      userId,
      status: 'ACCEPTED',
    });
    if (!member) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    const isSender = message.senderId.toString() === userId;
    const isAdminOrOwner = member.role === 'OWNER' || member.role === 'ADMIN';

    if (!isSender && !isAdminOrOwner) {
      throw new ForbiddenException('Bạn không có quyền thu hồi tin nhắn này');
    }

    // Nếu là người gửi tự thu hồi: chỉ cho phép trong vòng 24 giờ
    if (isSender && !isAdminOrOwner) {
      const messageAgeHours =
        (Date.now() - new Date((message as any).createdAt).getTime()) / (1000 * 60 * 60);
      if (messageAgeHours > 24) {
        throw new BadRequestException('Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ sau khi gửi');
      }
    }

    message.isRecalled = true;
    message.recalledAt = new Date();
    message.recalledBy = new Types.ObjectId(userId) as any;
    message.content = '';
    message.attachments = [];

    await message.save();
  }

  // Xóa tin nhắn ở phía tôi
  async deleteMessageForMe(userId: string, messageId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    const isMember = await this.memberModel.exists({
      conversationId: message.conversationId,
      userId,
      status: 'ACCEPTED',
    });
    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    await this.messageModel.findByIdAndUpdate(messageId, {
      $addToSet: { deletedBy: new Types.ObjectId(userId) },
    });
  }

  private transformMessage(doc: any): MessageResponseDto {
    const sender = doc.senderId
      ? {
          id: doc.senderId._id?.toString() ?? doc.senderId.toString(),
          firstName: doc.senderId.firstName ?? '',
          lastName: doc.senderId.lastName ?? '',
          email: doc.senderId.email ?? '',
        }
      : null;

    return plainToInstance(
      MessageResponseDto,
      {
        ...doc,
        id: doc._id?.toString(),
        sender,
        content: doc.isRecalled ? 'Tin nhắn đã bị thu hồi' : doc.content,
      },
      { excludeExtraneousValues: true },
    );
  }
}
