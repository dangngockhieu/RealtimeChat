import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Member, MemberSchema } from './schemas/member.schema';
import { Conversation, ConversationSchema } from '../conversation/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Member.name, schema: MemberSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService, MongooseModule],
})
export class MemberModule {}
