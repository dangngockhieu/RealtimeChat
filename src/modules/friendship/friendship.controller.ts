import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendRequestDto } from './dto/friendship.request.dto';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Friendship')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'friendships',
  version: '1',
})
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách bạn bè',
    description: 'Trả về toàn bộ danh sách bạn bè đã chấp nhận (status = ACCEPTED) của người dùng hiện tại',
  })
  @ApiOkResponse({ description: 'Lấy danh sách bạn bè thành công' })
  @ResponseMessage('Lấy danh sách bạn bè thành công')
  async getFriendships(@User() user: UserAccount) {
    const friendships = await this.friendshipService.getFriendshipsForUser(user.id);
    return {
      data: friendships,
    };
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Lấy danh sách lời mời kết bạn đang chờ',
    description: 'Danh sách các lời mời kết bạn gửi đến người dùng hiện tại đang chờ phản hồi',
  })
  @ApiOkResponse({ description: 'Lấy danh sách lời mời kết bạn đang chờ thành công' })
  @ResponseMessage('Lấy danh sách lời mời kết bạn đang chờ thành công')
  async getPendingFriendRequests(@User() user: UserAccount) {
    const pendingRequests = await this.friendshipService.getPendingFriendRequests(user.id);
    return {
      data: pendingRequests,
    };
  }

  @Get('blocked')
  @ApiOperation({
    summary: 'Lấy danh sách người dùng đã bị chặn',
    description: 'Danh sách những người dùng mà người dùng hiện tại đã chặn',
  })
  @ApiOkResponse({ description: 'Lấy danh sách người dùng đã chặn thành công' })
  @ResponseMessage('Lấy danh sách người dùng đã chặn thành công')
  async getBlockedUsers(@User() user: UserAccount) {
    const blockedUsers = await this.friendshipService.getBlockedUsers(user.id);
    return {
      data: blockedUsers,
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Gửi lời mời kết bạn',
    description: 'Tạo một yêu cầu kết bạn mới đến người dùng mục tiêu',
  })
  @ApiCreatedResponse({ description: 'Gửi lời mời kết bạn thành công' })
  @ApiBadRequestResponse({ description: 'Không thể tự gửi kết bạn cho chính mình' })
  @ApiConflictResponse({ description: 'Hai người đã là bạn bè hoặc đã có lời mời trước đó' })
  @ApiForbiddenResponse({ description: 'Không thể gửi kết bạn khi một trong hai đang bị chặn' })
  @ResponseMessage('Gửi lời mời kết bạn thành công')
  async createFriendship(@User() user: UserAccount, @Body() friendRequestDto: FriendRequestDto) {
    const { friendId } = friendRequestDto;
    const result = await this.friendshipService.createFriendship(user.id, friendId);
    return {
      data: result,
    };
  }

  @Post('block')
  @ApiOperation({
    summary: 'Chặn người dùng',
    description: 'Chặn một người dùng khác để không thể nhắn tin hoặc kết bạn',
  })
  @ApiOkResponse({ description: 'Chặn người dùng thành công' })
  @ApiBadRequestResponse({ description: 'Không thể tự chặn chính mình' })
  @ResponseMessage('Chặn người dùng thành công')
  async blockFriendship(@User() user: UserAccount, @Body() friendRequestDto: FriendRequestDto) {
    const { friendId } = friendRequestDto;
    await this.friendshipService.blockFriendship(user.id, friendId);
    return null;
  }

  @Delete('unblock/:friendId')
  @ApiOperation({
    summary: 'Bỏ chặn người dùng',
    description: 'Gỡ chặn một người dùng đã từng bị chặn trước đó',
  })
  @ApiParam({ name: 'friendId', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d2', description: 'ID người dùng cần bỏ chặn' })
  @ApiOkResponse({ description: 'Bỏ chặn người dùng thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy quan hệ chặn' })
  @ResponseMessage('Bỏ chặn người dùng thành công')
  async unBlockFriendship(@User() user: UserAccount, @Param('friendId') friendId: string) {
    await this.friendshipService.unBlockFriendship(user.id, friendId);
    return null;
  }

  @Delete(':id/remove_send')
  @ApiOperation({
    summary: 'Hủy lời mời kết bạn đã gửi',
    description: 'Người gửi thu hồi lời mời kết bạn đang ở trạng thái PENDING',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d3', description: 'ID bản ghi Friendship' })
  @ApiOkResponse({ description: 'Hủy lời mời kết bạn thành công' })
  @ApiForbiddenResponse({ description: 'Chỉ người gửi mới có thể hủy lời mời' })
  @ResponseMessage('Hủy lời mời kết bạn đã gửi thành công')
  async removeSendFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.removeSendFriendship(user.id, friendshipId);
    return null;
  }

  @Delete(':id/remove')
  @ApiOperation({
    summary: 'Hủy kết bạn',
    description: 'Xóa quan hệ bạn bè đã được ACCEPTED',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d3', description: 'ID bản ghi Friendship' })
  @ApiOkResponse({ description: 'Xóa bạn bè thành công' })
  @ApiForbiddenResponse({ description: 'Chỉ bạn bè mới có thể xóa mối quan hệ này' })
  @ResponseMessage('Xóa bạn bè thành công')
  async removeFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.removeFriendship(user.id, friendshipId);
    return null;
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Chấp nhận lời mời kết bạn',
    description: 'Người nhận đồng ý lời mời kết bạn và chuyển trạng thái sang ACCEPTED',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d3', description: 'ID bản ghi Friendship' })
  @ApiOkResponse({ description: 'Chấp nhận lời mời kết bạn thành công' })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền chấp nhận lời mời này' })
  @ResponseMessage('Chấp nhận lời mời kết bạn thành công')
  async acceptFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.acceptFriendship(user.id, friendshipId);
    return null;
  }

  @Patch(':id/decline')
  @ApiOperation({
    summary: 'Từ chối lời mời kết bạn',
    description: 'Người nhận từ chối lời mời kết bạn và chuyển trạng thái sang DECLINED',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d3', description: 'ID bản ghi Friendship' })
  @ApiOkResponse({ description: 'Từ chối lời mời kết bạn thành công' })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền từ chối lời mời này' })
  @ResponseMessage('Từ chối lời mời kết bạn thành công')
  async declineFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.declineFriendship(user.id, friendshipId);
    return null;
  }
}
