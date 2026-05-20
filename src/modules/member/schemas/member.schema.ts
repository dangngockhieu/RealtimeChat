import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Conversation } from '../../conversation/schemas/conversation.schema';
import { Message } from '../../message/schemas/message.schema';

export type MemberDocument = HydratedDocument<Member>;

@Schema({ timestamps: true })
export class Member {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId | Conversation;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({
    type: String,
    enum: ['OWNER', 'ADMIN', 'MEMBER'],
    default: 'MEMBER',
  })
  role: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'LEFT', 'REMOVED'],
    default: 'PENDING',
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @Prop({ type: Date, default: null })
  leftAt: Date | null;

  // Tin nhắn cuối cùng mà thành viên đã đọc trong cuộc trò chuyện
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  lastReadMessageId: Types.ObjectId | Message | null;

  // Dùng để đếm số lượng tin nhắn chưa đọc của thành viên trong cuộc trò chuyện
  @Prop({ type: Date, default: null })
  lastReadAt: Date | null;

  // Xóa lịch sử phía tôi
  @Prop({ type: Date, default: null })
  clearedAt: Date | null;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

MemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
MemberSchema.index({ userId: 1, status: 1 });
MemberSchema.index({ conversationId: 1, status: 1 });
MemberSchema.index({ conversationId: 1, role: 1, status: 1 });