import { Schema, model, Document, Types } from 'mongoose';
import { IConversation } from './conversation.schema';
import { IUser } from './user.schema';

export interface IMessage extends Document {
    _id: Types.ObjectId;
    conversationId: Types.ObjectId | IConversation;
    senderId: Types.ObjectId | IUser;
    content: string;
    // Trả lời tin nhắn nào
    replyTo?: Types.ObjectId | IMessage;
    // Tin nhắn đã bị thu hồi chưa
    isRecalled: boolean;
    // Thời gian thu hồi tin nhắn
    recallAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        isRecalled: {
            type: Boolean,
            default: false,
        },
        recallAt: {
            type: Date,
        }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', MessageSchema);