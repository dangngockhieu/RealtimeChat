import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import { GetMessagesDto, SendMessageDto } from './dto/message.request.dto';

@ApiTags('Message')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'message',
  version: '1',
})
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({
    summary: 'Gửi tin nhắn mới',
    description: 'Gửi tin nhắn (văn bản, tệp đính kèm hoặc trả lời tin nhắn cũ) vào cuộc trò chuyện',
  })
  @ApiCreatedResponse({ description: 'Gửi tin nhắn thành công, trả về chi tiết tin nhắn' })
  @ApiBadRequestResponse({ description: 'Nội dung hoặc tệp đính kèm không được để trống' })
  @ApiForbiddenResponse({ description: 'Không phải thành viên của cuộc trò chuyện' })
  @ApiNotFoundResponse({ description: 'Cuộc trò chuyện hoặc tin nhắn trả lời không tồn tại' })
  @ResponseMessage('Gửi tin nhắn thành công.')
  async sendMessage(@User() user: UserAccount, @Body() dto: SendMessageDto) {
    const data = await this.messageService.sendMessage(user.id, dto);
    return { data };
  }

  @Get(':conversationId')
  @ApiOperation({
    summary: 'Lấy lịch sử tin nhắn của cuộc trò chuyện',
    description: 'Lấy tin nhắn phân trang bằng con trỏ thời gian (Cursor Pagination), tự động lọc tin đã xóa và tin trước mốc xóa lịch sử',
  })
  @ApiParam({
    name: 'conversationId',
    required: true,
    example: '65f1a2b3c4d5e6f7a8b9c0d1',
    description: 'ID cuộc trò chuyện',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số lượng tin nhắn cần lấy (1 - 100)' })
  @ApiQuery({ name: 'cursor', required: false, example: '2026-10-01T15:00:00.000Z', description: 'Cursor ISO8601 lấy các tin nhắn cũ hơn' })
  @ApiOkResponse({ description: 'Lấy danh sách tin nhắn thành công' })
  @ApiForbiddenResponse({ description: 'Không thuộc cuộc trò chuyện này' })
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
  @ApiOperation({
    summary: 'Thu hồi tin nhắn',
    description: 'Người gửi (trong vòng 24h) hoặc Quản trị viên/Trưởng nhóm có thể thu hồi tin nhắn',
  })
  @ApiParam({
    name: 'id',
    required: true,
    example: '65f1a2b3c4d5e6f7a8b9c0d3',
    description: 'ID tin nhắn cần thu hồi',
  })
  @ApiOkResponse({ description: 'Thu hồi tin nhắn thành công' })
  @ApiForbiddenResponse({ description: 'Không có quyền thu hồi tin nhắn này' })
  @ApiBadRequestResponse({ description: 'Tin nhắn đã thu hồi trước đó hoặc quá thời hạn 24 giờ' })
  @ApiNotFoundResponse({ description: 'Tin nhắn không tồn tại' })
  @ResponseMessage('Thu hồi tin nhắn thành công.')
  async recallMessage(@User() user: UserAccount, @Param('id') id: string) {
    await this.messageService.recallMessage(user.id, id);
    return null;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa tin nhắn ở phía tôi',
    description: 'Thêm ID người dùng vào deletedBy của tin nhắn để ẩn tin nhắn đó ở phía người dùng này',
  })
  @ApiParam({
    name: 'id',
    required: true,
    example: '65f1a2b3c4d5e6f7a8b9c0d3',
    description: 'ID tin nhắn cần xóa phía tôi',
  })
  @ApiOkResponse({ description: 'Xóa tin nhắn phía tôi thành công' })
  @ApiNotFoundResponse({ description: 'Tin nhắn không tồn tại' })
  @ApiForbiddenResponse({ description: 'Không thuộc cuộc trò chuyện này' })
  @ResponseMessage('Xóa tin nhắn thành công.')
  async deleteMessageForMe(@User() user: UserAccount, @Param('id') id: string) {
    await this.messageService.deleteMessageForMe(user.id, id);
    return null;
  }
}
