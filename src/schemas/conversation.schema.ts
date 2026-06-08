import { Schema, model, Document, Types } from 'mongoose';
import { IMessage } from './message.schema';

export enum ConversationType {
    DIRECT = 'DIRECT',
    GROUP = 'GROUP',
}

export enum ConversationPrivacy {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export interface IConversation extends Document {
    _id: Types.ObjectId;
    type: ConversationType;
    privacy: ConversationPrivacy;
    name?: string;
    joinByLink: boolean;
    inviteCode?: string;
    lastMessage?: Types.ObjectId | IMessage;
    lastMessageAt?: Date;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        type: {
            type: String,
            enum: Object.values(ConversationType),
            required: true,
        },
        privacy: {
            type: String,
            enum: Object.values(ConversationPrivacy),
            required: true,
        },
        name: {
            type: String,
            trim: true,
        },
        // Mã mời tham gia nhóm
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        // Tin nhắn cuối cùng trong cuộc trò chuyện
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        // Thời gian gửi tin nhắn cuối cùng
        lastMessageAt: {
            type: Date,
        },
        // Số lượng thành viên trong cuộc trò chuyện
        memberCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

ConversationSchema.index({ type: 1, privacy: 1 });
ConversationSchema.index({ joinByLink: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);