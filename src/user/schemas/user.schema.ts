import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true
})
export class User {
    @Prop({required: true, unique: true})
    email: string;

    @Prop({required: true})
    password: string;

    @Prop({required: true})
    firstName: string;

    @Prop({required: true})
    lastName: string;

    @Prop({
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER'
    })
    role: string;

    @Prop({ default: false })
    isActive: boolean;

    @Prop({ select: false })
    otpCode: string;

    @Prop({ select: false })
    otpExpired: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);