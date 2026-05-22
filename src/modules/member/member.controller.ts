import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MemberService } from './member.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { ResponseMessage } from '../../auth/decorator/customize.decorator';
import {
  AddMembersDto,
  ClearHistoryDto,
  LeaveGroupDto,
  MarkAsReadDto,
  RemoveMemberDto,
  TransferOwnerDto,
  UpdateRoleDto,
} from './dto/member.request.dto';

@ApiTags('member')
@ApiBearerAuth('accessToken')
@Controller('member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('add')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm chat' })
  @ResponseMessage('Thêm thành viên thành công.')
  async addMembers(@User() user: UserAccount, @Body() dto: AddMembersDto) {
    await this.memberService.addMembers(user.id, dto);
    return null;
  }

  @Post('remove')
  @ApiOperation({ summary: 'Xóa thành viên khỏi nhóm chat' })
  @ResponseMessage('Xóa thành viên khỏi nhóm thành công.')
  async removeMember(@User() user: UserAccount, @Body() dto: RemoveMemberDto) {
    await this.memberService.removeMember(user.id, dto);
    return null;
  }

  @Post('leave')
  @ApiOperation({ summary: 'Rời khỏi nhóm chat' })
  @ResponseMessage('Rời nhóm thành công.')
  async leaveGroup(@User() user: UserAccount, @Body() dto: LeaveGroupDto) {
    await this.memberService.leaveGroup(user.id, dto);
    return null;
  }

  @Patch('role')
  @ApiOperation({ summary: 'Phân quyền ADMIN / MEMBER trong nhóm' })
  @ResponseMessage('Cập nhật vai trò thành công.')
  async updateRole(@User() user: UserAccount, @Body() dto: UpdateRoleDto) {
    await this.memberService.updateMemberRole(user.id, dto);
    return null;
  }

  @Patch('transfer-owner')
  @ApiOperation({ summary: 'Chuyển giao quyền Trưởng nhóm' })
  @ResponseMessage('Chuyển giao quyền Trưởng nhóm thành công.')
  async transferOwner(@User() user: UserAccount, @Body() dto: TransferOwnerDto) {
    await this.memberService.transferOwner(user.id, dto);
    return null;
  }

  @Patch('mark-as-read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc cuộc trò chuyện' })
  @ResponseMessage('Đánh dấu đã đọc thành công.')
  async markAsRead(@User() user: UserAccount, @Body() dto: MarkAsReadDto) {
    await this.memberService.markAsRead(user.id, dto);
    return null;
  }

  @Delete('clear-history')
  @ApiOperation({ summary: 'Xóa lịch sử tin nhắn phía tôi' })
  @ResponseMessage('Xóa lịch sử trò chuyện thành công.')
  async clearHistory(@User() user: UserAccount, @Body() dto: ClearHistoryDto) {
    await this.memberService.clearChatHistory(user.id, dto);
    return null;
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Lấy danh sách thành viên trong cuộc trò chuyện' })
  @ResponseMessage('Lấy danh sách thành viên thành công.')
  async getMembers(
    @User() user: UserAccount,
    @Param('conversationId') conversationId: string,
  ) {
    const data = await this.memberService.getMembers(user.id, conversationId);
    return { data };
  }
}
