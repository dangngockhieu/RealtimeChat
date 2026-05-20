import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Message } from '../../message/schemas/message.schema';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({
  timestamps: true
})
export class Conversation {

    @Prop({
      type: String,
      enum: ['DIRECT', 'GROUP'],
      required: true
    })
    type: string;

    @Prop({
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: null,
    })
    privacy: string;

    @Prop({ type: String, default: null })
    name: string | null;

    @Prop({ type: Boolean, default: false })
    joinByLink: boolean;

    @Prop({ type: String, unique: true, sparse: true, default: null, select: false })
    inviteCode: string | null;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
    lastMessage: Types.ObjectId | Message | null;

    @Prop({ type: Date, default: null })
    lastMessageAt: Date | null;

    @Prop({ type: Number, default: 0 })
    memberCount: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ type: 1, privacy: 1 });
ConversationSchema.index({ joinByLink: 1 });
ConversationSchema.index({ updatedAt: -1 });