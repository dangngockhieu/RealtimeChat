import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { CreateDirectChatDto, CreateGroupChatDto } from './dto/conversation.request.dto';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('create-group')
  @ResponseMessage('Tạo nhóm chat thành công.')
  async createGroupChat(@User() user: UserAccount, @Body() createGroupDto: CreateGroupChatDto) {
    const group = await this.conversationService.createGroupChat(user.id, createGroupDto);
    return {
      data: group
     };
  }

  @Post('create-direct')
  @ResponseMessage('Lấy chat trực tiếp thành công.')
  async createDirectChat(@User() user: UserAccount, @Body() createDirectDto: CreateDirectChatDto) {
    const directChat = await this.conversationService.findOrCreateDirectChat(user.id, createDirectDto.targetUserId);
    return {
      data: directChat
    };
  }

  @Get('my-conversations')
  @ResponseMessage('Lấy danh sách cuộc trò chuyện thành công.')
  async getMyConversations(
    @User() user: UserAccount,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string)
  {
    const { result, nextCursor, hasNextPage } = await this.conversationService.getMyConversations(user.id, limit, cursor);
    return {
        data: result,
        meta: {
          nextCursor,
          hasNextPage
        }
    };
  }
}
