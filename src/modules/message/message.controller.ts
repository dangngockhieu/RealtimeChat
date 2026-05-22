import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import { GetMessagesDto, SendMessageDto } from './dto/message.request.dto';

@ApiTags('message')
@ApiBearerAuth('accessToken')
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: 'Gửi tin nhắn mới' })
  @ResponseMessage('Gửi tin nhắn thành công.')
  async sendMessage(@User() user: UserAccount, @Body() dto: SendMessageDto) {
    const data = await this.messageService.sendMessage(user.id, dto);
    return { data };
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của cuộc trò chuyện (cursor pagination)' })
  @ResponseMessage('Lấy tin nhắn thành công.')
  async getMessages(
    @User() user: UserAccount,
    @Param('conversationId') conversationId: string,
    @Query() dto: GetMessagesDto,
  ) {
    const result = await this.messageService.getMessages(user.id, conversationId, dto);
    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Patch(':id/recall')
  @ApiOperation({ summary: 'Thu hồi tin nhắn' })
  @ResponseMessage('Thu hồi tin nhắn thành công.')
  async recallMessage(@User() user: UserAccount, @Param('id') id: string) {
    await this.messageService.recallMessage(user.id, id);
    return null;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tin nhắn ở phía tôi' })
  @ResponseMessage('Xóa tin nhắn thành công.')
  async deleteMessageForMe(@User() user: UserAccount, @Param('id') id: string) {
    await this.messageService.deleteMessageForMe(user.id, id);
    return null;
  }
}
