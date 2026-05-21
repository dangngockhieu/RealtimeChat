import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [MemberModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
