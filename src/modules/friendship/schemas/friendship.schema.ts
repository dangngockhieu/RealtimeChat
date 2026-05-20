import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export type FriendshipDocument = HydratedDocument<Friendship>;

@Schema({
  timestamps: true
})
export class Friendship {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    requester: Types.ObjectId | User // Người gửi lời mời

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    recipient: Types.ObjectId | User // Người nhận lời mời


    @Prop({
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'],
        default: 'PENDING'
    })

    status: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
    blockedBy: Types.ObjectId | null;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
FriendshipSchema.index({ requester: 1, recipient: 1 });
FriendshipSchema.index({ recipient: 1, requester: 1 });

FriendshipSchema.index({ recipient: 1, status: 1 });
FriendshipSchema.index({ blockedBy: 1, status: 1 });
FriendshipSchema.index({ requester: 1, status: 1 });