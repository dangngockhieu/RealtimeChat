import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.schema';

export enum FriendshipStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    BLOCKED = 'BLOCKED',
}

export interface IFriendship extends Document {
    _id: Types.ObjectId;
    requester: Types.ObjectId | IUser;   // Người gửi lời mời
    recipient: Types.ObjectId | IUser;   // Người nhận lời mời
    status: FriendshipStatus;
    blockedBy: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
    {
        requester: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(FriendshipStatus),
            default: FriendshipStatus.PENDING,
        },
        blockedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

FriendshipSchema.index({ requester: 1, recipient: 1 });
FriendshipSchema.index({ recipient: 1, requester: 1 });
FriendshipSchema.index({ recipient: 1, status: 1 });
FriendshipSchema.index({ blockedBy: 1, status: 1 });
FriendshipSchema.index({ requester: 1, status: 1 });

export const Friendship = model<IFriendship>('Friendship', FriendshipSchema);