import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ChangePasswordDto, UpdateUserDto } from './dto/user.request.dto';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { Public, ResponseMessage } from '../../auth/decorator/customize.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1'
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('change-password')
  @ResponseMessage('Đổi mật khẩu thành công')
  async changePassword(@Body() dto: ChangePasswordDto, @User() user: UserAccount) {
    await this.userService.updatePassword(user.id, dto);
  }

  @Patch()
  @ResponseMessage('Cập nhật hồ sơ thành công')
  async updateProfile(@Body() dto: UpdateUserDto, @User() user: UserAccount) {
    const userUpdated = await this.userService.updateUserProfile(user.id, dto);
    return {
      data: userUpdated
    };
  }

  @Get("paginate")
  @Public()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getALlUsers(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query() search: string
  ) {
    const users = await this.userService.getAllUsesrs(+page, +limit, search);
    return {
      data: users.data,
      meta: users.meta
    };
  }

  @Get()
  @ResponseMessage('Lấy người dùng theo email thành công')
  async getUserByEmail(@Query('email') email: string) {
    const userFound = await this.userService.getUserByEmail(email);
    return {
      data: userFound
    };
  }

  @Get('profile')
  @ResponseMessage('Lấy hồ sơ người dùng thành công')
  async getProfile(@User() user: UserAccount) {
    return {
      data: user
    };
  }

  @Get(':id')
  @ResponseMessage('Lấy người dùng theo ID thành công')
  async getUserById(@Param('id') id: string) {
    const userFound = await this.userService.getUserById(id);
    return {
      data: userFound
    };
  }
}
