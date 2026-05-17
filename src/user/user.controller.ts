import { Body, Controller, Get, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ChangePasswordDto, UpdateUserDto } from './dto/user.request.dto';
import { User } from '../auth/decorator/user.decorator';
import { UserAccount } from '../response';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @User() user: UserAccount) {
    await this.userService.updatePassword(user.id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Password updated successfully',
    };
  }

  @Patch()
  async updateProfile(@Body() dto: UpdateUserDto, @User() user: UserAccount) {
    const userUpdated = await this.userService.updateUserProfile(user.id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: userUpdated
    };
  }

  @Get()
  async getUserByEmail(@Query('email') email: string) {
    const userFound = await this.userService.getUserByEmail(email);
    return {
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data: userFound
    };
  }

  @Get('profile')
  async getProfile(@User() user: UserAccount) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: user
    };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const userFound = await this.userService.getUserById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: userFound
    };
  }
}
