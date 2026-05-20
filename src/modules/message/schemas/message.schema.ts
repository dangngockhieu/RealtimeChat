import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Conversation } from '../../conversation/schemas/conversation.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId | Conversation;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId | User;

  @Prop({ type: String, default: '' })
  content: string;

  //Trả lời tin nhắn nào
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  replyTo: Types.ObjectId | Message | null;

  // Tin nhắn đã bị thu hồi chưa
  @Prop({ type: Boolean, default: false })
  isRecalled: boolean;

  // Thời gian thu hồi tin nhắn
  @Prop({ type: Date, default: null })
  recalledAt: Date | null;

  // Đánh dấu ai đã thu hồi tin nhắn(ng gửi hoặc admin thu hồi)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  recalledBy: Types.ObjectId | User | null;

  // Danh sách người dùng đã xóa tin nhắn này
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  deletedBy: Types.ObjectId[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });