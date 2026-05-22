import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MemberModule } from '../member/member.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from '../message/schemas/message.schema';
import { Member, MemberSchema } from '../member/schemas/member.schema';

@Module({
  imports: [
    MemberModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Member.name, schema: MemberSchema },
    ]),
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService, MongooseModule],
})
export class ConversationModule {}
