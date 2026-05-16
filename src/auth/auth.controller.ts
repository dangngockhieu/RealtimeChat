import { Body, Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto } from './dto/auth.request.dto';
import { LocalAuthGuard } from './local/local.guard';
import { UserLogin } from './dto';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from './decorator/customize.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService
  ) {}

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

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterRequestDto) {
    await this.authService.register(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Đăng ký thành công',
    };
  }
}
