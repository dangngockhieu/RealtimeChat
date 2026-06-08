import { Schema, model, Document, Types } from 'mongoose';
import { IConversation } from './conversation.schema';
import { IUser } from './user.schema';
import { IMessage } from './message.schema';

export enum MemberRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
}

export enum MemberStatus{
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    LEFT = 'LEFT',
    REMOVED = 'REMOVED',
}

export interface IMember extends Document {
    _id: Types.ObjectId;
    conversationId: Types.ObjectId | IConversation;
    userId: Types.ObjectId | IUser;
    memberRole: MemberRole;
    status: MemberStatus;
    joinAt: Date;
    leftAt?: Date;
    lastReadMessageId?: Types.ObjectId | IMessage;
    lastReadAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        memberRole: {
            type: String,
            enum: Object.values(MemberRole),
            required: true,
            default: MemberRole.MEMBER,
        },
        status: {
            type: String,
            enum: Object.values(MemberStatus),
            required: true,
            default: MemberStatus.PENDING,
        },
        joinAt: {
            type: Date,
            required: true,
        },
        leftAt: {
            type: Date,
        },
        lastReadMessageId: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastReadAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

MemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
MemberSchema.index({ userId: 1, status: 1 });
MemberSchema.index({ conversationId: 1, status: 1 });
MemberSchema.index({ conversationId: 1, role: 1, status: 1 });

export const Member = model<IMember>('Member', MemberSchema);