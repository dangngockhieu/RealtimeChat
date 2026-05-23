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

@ApiTags('Conversation')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'conversation',
  version: '1',
})
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('create-group')
  @ApiOperation({
    summary: 'Tạo nhóm chat mới',
    description: 'Tạo nhóm chat với tên, quyền riêng tư và danh sách các thành viên ban đầu',
  })
  @ApiCreatedResponse({ description: 'Tạo nhóm chat thành công, trả về thông tin chi tiết cuộc trò chuyện' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc số lượng thành viên không đủ' })
  @ResponseMessage('Tạo nhóm chat thành công.')
  async createGroupChat(@User() user: UserAccount, @Body() createGroupDto: CreateGroupChatDto) {
    const group = await this.conversationService.createGroupChat(user.id, createGroupDto);
    return {
      data: group,
    };
  }

  @Post('create-direct')
  @ApiOperation({
    summary: 'Lấy hoặc tạo cuộc trò chuyện trực tiếp 1-1',
    description: 'Nếu đã tồn tại chat 1-1 giữa 2 người thì trả về cuộc trò chuyện cũ, nếu chưa thì tạo mới',
  })
  @ApiCreatedResponse({ description: 'Lấy hoặc tạo chat 1-1 thành công' })
  @ApiBadRequestResponse({ description: 'targetUserId không hợp lệ' })
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
  @ApiOperation({
    summary: 'Lấy danh sách các cuộc trò chuyện của tôi',
    description: 'Lấy danh sách các nhóm chat và chat 1-1 mà người dùng tham gia, sắp xếp theo tin nhắn mới nhất (cursor pagination)',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số lượng cuộc trò chuyện mỗi trang' })
  @ApiQuery({ name: 'cursor', required: false, example: '2026-10-01T15:00:00.000Z', description: 'Cursor mốc thời gian lấy các cuộc trò chuyện cũ hơn' })
  @ApiOkResponse({ description: 'Lấy danh sách cuộc trò chuyện thành công' })
  @ResponseMessage('Lấy danh sách cuộc trò chuyện thành công.')
  async getMyConversations(
    @User() user: UserAccount,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const { result, nextCursor, hasNextPage } = await this.conversationService.getMyConversations(
      user.id,
      limit ? +limit : 20,
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
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết cuộc trò chuyện',
    description: 'Xem chi tiết thông tin, quyền hạn cá nhân (myMembership) và danh sách thành viên trong cuộc trò chuyện',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện' })
  @ApiOkResponse({ description: 'Lấy chi tiết cuộc trò chuyện thành công' })
  @ApiNotFoundResponse({ description: 'Cuộc trò chuyện không tồn tại' })
  @ApiForbiddenResponse({ description: 'Người dùng không thuộc cuộc trò chuyện này' })
  @ResponseMessage('Lấy chi tiết cuộc trò chuyện thành công.')
  async getConversationDetail(@User() user: UserAccount, @Param('id') id: string) {
    const data = await this.conversationService.getConversationDetail(id, user.id);
    return { data };
  }

  @Patch(':id/name')
  @ApiOperation({
    summary: 'Đổi tên nhóm chat',
    description: 'Chỉ Quản trị viên (ADMIN) hoặc Trưởng nhóm (OWNER) mới có quyền đổi tên nhóm chat',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @ApiOkResponse({ description: 'Đổi tên nhóm chat thành công' })
  @ApiForbiddenResponse({ description: 'Không có quyền đổi tên nhóm' })
  @ApiBadRequestResponse({ description: 'Thao tác chỉ áp dụng cho nhóm chat' })
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
  @ApiOperation({
    summary: 'Giải tán nhóm chat',
    description: 'Chỉ Trưởng nhóm (OWNER) mới có quyền giải tán nhóm chat',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID cuộc trò chuyện nhóm' })
  @ApiOkResponse({ description: 'Giải tán nhóm chat thành công' })
  @ApiForbiddenResponse({ description: 'Chỉ Trưởng nhóm mới có quyền giải tán nhóm' })
  @ResponseMessage('Giải tán nhóm chat thành công.')
  async disbandGroup(@User() user: UserAccount, @Param('id') id: string) {
    await this.conversationService.disbandGroup(id, user.id);
    return null;
  }
}
