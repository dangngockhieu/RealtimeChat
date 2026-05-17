import { Body, Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto } from './dto/auth.request.dto';
import { LocalAuthGuard } from './local/local.guard';
import { UserAccount, UserLogin } from '../response';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from './decorator/customize.decorator';
import { User } from './decorator/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService
  ) {}

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterRequestDto) {
    await this.authService.register(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Đăng ký thành công',
    };
  }

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  async login(@Body() _body: LoginRequestDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as UserLogin;
    const data = await this.authService.login(user);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (req.cookies?.refreshToken) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        domain: isProd ? '.techzone.vn' : undefined
      });
    }
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: isProd ? '.techzone.vn' : undefined
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        accessToken: data.accessToken,
        user: user
      }
    };
  }

  @Post('logout')
  async logout(@User() user: UserAccount, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (req.cookies?.refreshToken) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        domain: isProd ? '.techzone.vn' : undefined
      });
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
    };
  }

}
