import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MemberService } from './member.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Member')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'member',
  version: '1',
})
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('add')
  @ApiOperation({
    summary: 'Thêm thành viên vào nhóm chat',
    description: 'Chỉ Quản trị viên (ADMIN) hoặc Trưởng nhóm (OWNER) mới có quyền thêm thành viên',
  })
  @ApiOkResponse({ description: 'Thêm thành viên thành công' })
  @ApiForbiddenResponse({ description: 'Không có quyền thêm thành viên' })
  @ApiBadRequestResponse({ description: 'Danh sách thành viên không hợp lệ hoặc nhóm đã giải tán' })
  @ResponseMessage('Thêm thành viên thành công.')
  async addMembers(@User() user: UserAccount, @Body() dto: AddMembersDto) {
    await this.memberService.addMembers(user.id, dto);
    return null;
  }

  @Post('remove')
  @ApiOperation({
    summary: 'Xóa thành viên khỏi nhóm chat',
    description: 'OWNER có thể xóa ADMIN/MEMBER, ADMIN chỉ có thể xóa MEMBER',
  })
  @ApiOkResponse({ description: 'Xóa thành viên khỏi nhóm thành công' })
  @ApiForbiddenResponse({ description: 'Không có quyền xóa thành viên này' })
  @ApiNotFoundResponse({ description: 'Thành viên không còn trong nhóm' })
  @ResponseMessage('Xóa thành viên khỏi nhóm thành công.')
  async removeMember(@User() user: UserAccount, @Body() dto: RemoveMemberDto) {
    await this.memberService.removeMember(user.id, dto);
    return null;
  }

  @Post('leave')
  @ApiOperation({
    summary: 'Rời khỏi nhóm chat',
    description: 'Rời nhóm. Nếu là OWNER thì phải chuyển quyền trước khi rời (trừ khi nhóm chỉ còn 1 người thì sẽ giải tán)',
  })
  @ApiOkResponse({ description: 'Rời nhóm thành công' })
  @ApiBadRequestResponse({ description: 'Trưởng nhóm phải chuyển quyền trước khi rời' })
  @ResponseMessage('Rời nhóm thành công.')
  async leaveGroup(@User() user: UserAccount, @Body() dto: LeaveGroupDto) {
    await this.memberService.leaveGroup(user.id, dto);
    return null;
  }

  @Patch('role')
  @ApiOperation({
    summary: 'Phân quyền ADMIN / MEMBER trong nhóm',
    description: 'Chỉ Trưởng nhóm (OWNER) mới có quyền thăng hoặc hạ quyền Quản trị viên',
  })
  @ApiOkResponse({ description: 'Cập nhật vai trò thành công' })
  @ApiForbiddenResponse({ description: 'Chỉ Trưởng nhóm mới có quyền phân quyền' })
  @ResponseMessage('Cập nhật vai trò thành công.')
  async updateRole(@User() user: UserAccount, @Body() dto: UpdateRoleDto) {
    await this.memberService.updateMemberRole(user.id, dto);
    return null;
  }

  @Patch('transfer-owner')
  @ApiOperation({
    summary: 'Chuyển giao quyền Trưởng nhóm',
    description: 'Chỉ Trưởng nhóm (OWNER) hiện tại mới có quyền chuyển nhượng nhóm cho thành viên khác',
  })
  @ApiOkResponse({ description: 'Chuyển giao quyền Trưởng nhóm thành công' })
  @ApiForbiddenResponse({ description: 'Chỉ Trưởng nhóm mới có quyền chuyển giao' })
  @ResponseMessage('Chuyển giao quyền Trưởng nhóm thành công.')
  async transferOwner(@User() user: UserAccount, @Body() dto: TransferOwnerDto) {
    await this.memberService.transferOwner(user.id, dto);
    return null;
  }

  @Patch('mark-as-read')
  @ApiOperation({
    summary: 'Đánh dấu đã đọc cuộc trò chuyện',
    description: 'Cập nhật mốc thời gian lastReadAt và lastReadMessageId để reset số lượng tin nhắn chưa đọc',
  })
  @ApiOkResponse({ description: 'Đánh dấu đã đọc thành công' })
  @ApiNotFoundResponse({ description: 'Người dùng không thuộc cuộc trò chuyện' })
  @ResponseMessage('Đánh dấu đã đọc thành công.')
  async markAsRead(@User() user: UserAccount, @Body() dto: MarkAsReadDto) {
    await this.memberService.markAsRead(user.id, dto);
    return null;
  }

  @Delete('clear-history')
  @ApiOperation({
    summary: 'Xóa lịch sử tin nhắn phía tôi',
    description: 'Cập nhật clearedAt cho thành viên, các tin nhắn trước mốc này sẽ không hiển thị với người dùng này nữa',
  })
  @ApiOkResponse({ description: 'Xóa lịch sử trò chuyện thành công' })
  @ApiNotFoundResponse({ description: 'Người dùng không thuộc cuộc trò chuyện' })
  @ResponseMessage('Xóa lịch sử trò chuyện thành công.')
  async clearHistory(@User() user: UserAccount, @Body() dto: ClearHistoryDto) {
    await this.memberService.clearChatHistory(user.id, dto);
    return null;
  }

  @Get(':conversationId')
  @ApiOperation({
    summary: 'Lấy danh sách thành viên trong cuộc trò chuyện',
    description: 'Lấy toàn bộ thông tin các thành viên đang hoạt động trong nhóm',
  })
  @ApiParam({
    name: 'conversationId',
    required: true,
    example: '65f1a2b3c4d5e6f7a8b9c0d1',
    description: 'ID cuộc trò chuyện',
  })
  @ApiOkResponse({ description: 'Lấy danh sách thành viên thành công' })
  @ApiForbiddenResponse({ description: 'Bạn không thuộc cuộc trò chuyện này' })
  @ResponseMessage('Lấy danh sách thành viên thành công.')
  async getMembers(
    @User() user: UserAccount,
    @Param('conversationId') conversationId: string,
  ) {
    const data = await this.memberService.getMembers(user.id, conversationId);
    return { data };
  }
}
