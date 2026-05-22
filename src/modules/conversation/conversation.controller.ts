import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import {
  CreateDirectChatDto,
  CreateGroupChatDto,
  UpdateGroupNameDto,
} from './dto/conversation.request.dto';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('conversation')
@ApiBearerAuth('accessToken')
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('create-group')
  @ApiOperation({ summary: 'Tạo nhóm chat' })
  @ResponseMessage('Tạo nhóm chat thành công.')
  async createGroupChat(@User() user: UserAccount, @Body() createGroupDto: CreateGroupChatDto) {
    const group = await this.conversationService.createGroupChat(user.id, createGroupDto);
    return {
      data: group,
    };
  }

  @Post('create-direct')
  @ApiOperation({ summary: 'Lấy hoặc tạo chat 1-1 trực tiếp' })
  @ResponseMessage('Lấy chat trực tiếp thành công.')
  async createDirectChat(@User() user: UserAccount, @Body() createDirectDto: CreateDirectChatDto) {
    const directChat = await this.conversationService.findOrCreateDirectChat(
      user.id,
      createDirectDto.targetUserId,
    );
    return {
      data: directChat,
    };
  }

  @Get('my-conversations')
  @ApiOperation({ summary: 'Lấy danh sách cuộc trò chuyện của tôi' })
  @ResponseMessage('Lấy danh sách cuộc trò chuyện thành công.')
  async getMyConversations(
    @User() user: UserAccount,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const { result, nextCursor, hasNextPage } = await this.conversationService.getMyConversations(
      user.id,
      limit,
      cursor,
    );
    return {
      data: result,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết cuộc trò chuyện' })
  @ResponseMessage('Lấy chi tiết cuộc trò chuyện thành công.')
  async getConversationDetail(@User() user: UserAccount, @Param('id') id: string) {
    const data = await this.conversationService.getConversationDetail(id, user.id);
    return { data };
  }

  @Patch(':id/name')
  @ApiOperation({ summary: 'Đổi tên nhóm chat' })
  @ResponseMessage('Đổi tên nhóm chat thành công.')
  async updateGroupName(
    @User() user: UserAccount,
    @Param('id') id: string,
    @Body() dto: UpdateGroupNameDto,
  ) {
    await this.conversationService.updateGroupName(id, user.id, dto.name);
    return null;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Giải tán nhóm chat (Chỉ Trưởng nhóm)' })
  @ResponseMessage('Giải tán nhóm chat thành công.')
  async disbandGroup(@User() user: UserAccount, @Param('id') id: string) {
    await this.conversationService.disbandGroup(id, user.id);
    return null;
  }
}
