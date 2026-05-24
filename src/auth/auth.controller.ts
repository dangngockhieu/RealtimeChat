import { BadRequestException, Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto, ResendOtpDto, VerifyOtpDto } from './dto/auth.request.dto';
import { LocalAuthGuard } from './local/local.guard';
import { UserAccount, UserLogin } from '../response';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public, ResponseMessage } from './decorator/customize.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Đăng ký tài khoản mới',
    description: 'Tạo tài khoản người dùng với email, mật khẩu và họ tên, đồng thời gửi mã OTP kích hoạt qua email',
  })
  @ApiCreatedResponse({ description: 'Đăng ký tài khoản thành công, mã OTP đã được gửi qua email' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ hoặc email đã tồn tại' })
  @ResponseMessage('Đăng ký tài khoản thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực.')
  async register(@Body() dto: RegisterRequestDto) {
    await this.authService.register(dto);
    return null;
  }

  @Post('verify-otp')
  @Public()
  @ApiOperation({
    summary: 'Xác thực OTP kích hoạt tài khoản',
    description: 'Nhập email và mã OTP 6 số để kích hoạt tài khoản (isActive: true)',
  })
  @ApiOkResponse({ description: 'Xác thực tài khoản thành công' })
  @ApiBadRequestResponse({ description: 'Mã OTP không chính xác hoặc đã hết hạn' })
  @ResponseMessage('Xác thực tài khoản thành công. Bây giờ bạn có thể đăng nhập.')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.authService.verifyOtp(dto);
    return null;
  }

  @Post('resend-otp')
  @Public()
  @ApiOperation({
    summary: 'Gửi lại mã OTP kích hoạt',
    description: 'Tạo mã OTP mới và gửi lại vào email của người dùng',
  })
  @ApiOkResponse({ description: 'Gửi lại mã OTP thành công' })
  @ApiBadRequestResponse({ description: 'Tài khoản đã kích hoạt hoặc không tồn tại' })
  @ResponseMessage('Mã OTP mới đã được gửi vào email của bạn.')
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.authService.resendOtp(dto);
    return null;
  }

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Đăng nhập hệ thống',
    description: 'Xác thực tài khoản bằng email & password, trả về Access Token và lưu Refresh Token vào cookie',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ description: 'Đăng nhập thành công, trả về Access Token và thông tin user' })
  @ApiUnauthorizedResponse({ description: 'Email hoặc mật khẩu không chính xác' })
  @ResponseMessage('Đăng nhập thành công')
  async login(
    @Body() _body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as UserLogin;
    const data = await this.authService.login(user);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (req.cookies?.refreshToken) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        domain: isProd ? '.techzone.vn' : undefined,
      });
    }
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: isProd ? '.techzone.vn' : undefined,
    });

    return {
      data: {
        accessToken: data.accessToken,
        user: user,
      },
    };
  }

  @Post('logout')
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Đăng xuất tài khoản',
    description: 'Hủy Refresh Token trong cơ sở dữ liệu và xóa cookie refreshToken',
  })
  @ApiOkResponse({ description: 'Đăng xuất thành công' })
  @ApiUnauthorizedResponse({ description: 'Chưa xác thực JWT' })
  @ResponseMessage('Đăng xuất thành công')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as UserAccount;
    await this.authService.logout(user.id);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (req.cookies?.refreshToken) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        domain: isProd ? '.techzone.vn' : undefined,
      });
    }
    return null;
  }

  @Post('refresh')
  @Public()
  @ApiOperation({
    summary: 'Làm mới Access Token',
    description: 'Sử dụng refreshToken lưu trong cookie để cấp Access Token mới và xoay vòng Refresh Token',
  })
  @ApiOkResponse({ description: 'Làm mới token thành công, trả về Access Token mới' })
  @ApiBadRequestResponse({ description: 'Không tìm thấy hoặc Refresh Token không hợp lệ' })
  @ResponseMessage('Làm mới token thành công')
  async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }
    const data = await this.authService.refreshTokens(refreshToken);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: isProd ? '.techzone.vn' : undefined,
    });

    return {
      data: {
        accessToken: data.accessToken,
      },
    };
  }
}
