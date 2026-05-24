import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { ChangePasswordDto, UpdateAvatarDto, UpdateUserDto } from './dto/user.request.dto';
import { User } from '../../auth/decorator/user.decorator';
import { UserAccount } from '../../response';
import { Public, ResponseMessage } from '../../auth/decorator/customize.decorator';
import { avatarStorage, imageFileFilter } from '../upload/upload.controller';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('accessToken')
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('change-password')
  @ApiOperation({
    summary: 'Đổi mật khẩu người dùng',
    description: 'Xác thực mật khẩu cũ và đổi sang mật khẩu mới',
  })
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công' })
  @ApiBadRequestResponse({ description: 'Mật khẩu xác nhận không khớp' })
  @ApiForbiddenResponse({ description: 'Mật khẩu cũ không chính xác' })
  @ResponseMessage('Đổi mật khẩu thành công')
  async changePassword(@Body() dto: ChangePasswordDto, @User() user: UserAccount) {
    await this.userService.updatePassword(user.id, dto);
    return null;
  }

  @Patch()
  @ApiOperation({
    summary: 'Cập nhật thông tin cá nhân',
    description: 'Cập nhật email, họ hoặc tên của người dùng',
  })
  @ApiOkResponse({ description: 'Cập nhật hồ sơ thành công, trả về thông tin đã sửa' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @ResponseMessage('Cập nhật hồ sơ thành công')
  async updateProfile(@Body() dto: UpdateUserDto, @User() user: UserAccount) {
    const userUpdated = await this.userService.updateUserProfile(user.id, dto);
    return {
      data: userUpdated,
    };
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Tải lên và thay đổi ảnh đại diện cá nhân',
    description: 'Tải lên file ảnh mới, tự động xóa avatar cũ trên server nếu có và cập nhật avatar mới cho tài khoản',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp hình ảnh avatar (JPG, PNG, GIF, WEBP, tối đa 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Cập nhật ảnh đại diện thành công' })
  @ApiBadRequestResponse({ description: 'File không hợp lệ hoặc không có file tải lên' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ResponseMessage('Cập nhật ảnh đại diện thành công')
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserAccount,
  ) {
    const data = await this.userService.uploadAndChangeAvatar(user.id, file);
    return { data };
  }

  @Patch('avatar')
  @ApiOperation({
    summary: 'Cập nhật ảnh đại diện cá nhân bằng URL',
    description: 'Cập nhật đường dẫn avatar mới cho người dùng hiện tại, tự động xóa file avatar cũ trên server nếu có',
  })
  @ApiOkResponse({ description: 'Cập nhật ảnh đại diện thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @ResponseMessage('Cập nhật ảnh đại diện thành công')
  async updateAvatar(@Body() dto: UpdateAvatarDto, @User() user: UserAccount) {
    const data = await this.userService.updateAvatar(user.id, dto.avatarUrl);
    return { data };
  }

  @Delete('avatar')
  @ApiOperation({
    summary: 'Gỡ ảnh đại diện cá nhân',
    description: 'Gỡ bỏ ảnh đại diện (set avatar về null), tự động xóa file avatar cũ trên server nếu có',
  })
  @ApiOkResponse({ description: 'Gỡ ảnh đại diện thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @ResponseMessage('Gỡ ảnh đại diện thành công')
  async removeAvatar(@User() user: UserAccount) {
    const data = await this.userService.removeAvatar(user.id);
    return { data };
  }

  @Get('paginate')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách người dùng có phân trang và tìm kiếm',
    description: 'Hỗ trợ phân trang page, limit và bộ lọc query filter (api-query-params)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Số trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Số lượng item mỗi trang' })
  @ApiOkResponse({ description: 'Lấy danh sách người dùng thành công kèm metadata phân trang' })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getALlUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query() search: string,
  ) {
    const users = await this.userService.getAllUsesrs(+page || 1, +limit || 10, search);
    return {
      data: users.data,
      meta: users.meta,
    };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Lấy thông tin hồ sơ của tài khoản hiện tại',
    description: 'Trả về thông tin người dùng được trích xuất từ JWT token',
  })
  @ApiOkResponse({ description: 'Lấy thông tin hồ sơ thành công' })
  @ResponseMessage('Lấy hồ sơ người dùng thành công')
  async getProfile(@User() user: UserAccount) {
    return {
      data: user,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Tìm kiếm người dùng theo email',
    description: 'Lấy thông tin công khai của người dùng qua email',
  })
  @ApiQuery({ name: 'email', required: true, example: 'user@example.com', description: 'Email cần tìm' })
  @ApiOkResponse({ description: 'Tìm thấy thông tin người dùng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng với email tương ứng' })
  @ResponseMessage('Lấy người dùng theo email thành công')
  async getUserByEmail(@Query('email') email: string) {
    const userFound = await this.userService.getUserByEmail(email);
    return {
      data: userFound,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin người dùng theo ID',
    description: 'Lấy thông tin công khai của người dùng qua MongoId',
  })
  @ApiParam({ name: 'id', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID người dùng' })
  @ApiOkResponse({ description: 'Lấy thông tin người dùng thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @ResponseMessage('Lấy người dùng theo ID thành công')
  async getUserById(@Param('id') id: string) {
    const userFound = await this.userService.getUserById(id);
    return {
      data: userFound,
    };
  }
}
