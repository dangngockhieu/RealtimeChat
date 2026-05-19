import { Friendship } from './schemas/friendship.schema';
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendRequestDto } from './dto/friendship.request.dto';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Friendship')
@Controller({
  path: 'friendships',
  version: '1'
})
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  @ResponseMessage('Lấy danh sách bạn bè thành công')
  async getFriendships(@User() user: UserAccount) {
    const friendships = await this.friendshipService.getFriendshipsForUser(user.id);
    return {
      data: friendships
    };
  }

  @Get('pending')
  @ResponseMessage('Lấy danh sách lời mời kết bạn đang chờ thành công')
  async getPendingFriendRequests(@User() user: UserAccount) {
    const pendingRequests = await this.friendshipService.getPendingFriendRequests(user.id);
    return {
      data: pendingRequests
    };
  }

  @Get('blocked')
  @ResponseMessage('Lấy danh sách người dùng đã chặn thành công')
  async getBlockedUsers(@User() user: UserAccount) {
    const blockedUsers = await this.friendshipService.getBlockedUsers(user.id);
    return {
      data: blockedUsers
    };
  }

  @Post()
  @ResponseMessage('Gửi lời mời kết bạn thành công')
  async createFriendship(@User() user: UserAccount, @Body() friendRequestDto: FriendRequestDto) {
    const { friendId } = friendRequestDto;
    const result = await this.friendshipService.createFriendship(user.id, friendId);
    return {
      data: result
    };
  }

  @Post('block')
  @ResponseMessage('Chặn người dùng thành công')
  async blockFriendship(@User() user: UserAccount, @Body() friendRequestDto: FriendRequestDto) {
    const { friendId } = friendRequestDto;
    await this.friendshipService.blockFriendship(user.id, friendId);
  }

  @Delete('unblock/:friendId')
  @ResponseMessage('Bỏ chặn người dùng thành công')
  async unBlockFriendship(@User() user: UserAccount, @Param('friendId') friendId: string) {
    await this.friendshipService.unBlockFriendship(user.id, friendId);
  }

  @Delete(":id/remove_send")
  @ResponseMessage('Hủy lời mời kết bạn đã gửi thành công')
  async removeSendFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.removeSendFriendship(user.id, friendshipId);
  }

  @Delete(":id/remove")
  @ResponseMessage('Xóa bạn bè thành công')
  async removeFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.removeFriendship(user.id, friendshipId);
  }

  @Patch(':id/accept')
  @ResponseMessage('Chấp nhận lời mời kết bạn thành công')
  async acceptFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.acceptFriendship(user.id, friendshipId);
  }

  @Patch(':id/decline')
  @ResponseMessage('Từ chối lời mời kết bạn thành công')
  async declineFriendship(@User() user: UserAccount, @Param('id') friendshipId: string) {
    await this.friendshipService.declineFriendship(user.id, friendshipId);
  }

}
