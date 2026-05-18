import { BadRequestException, Body, Controller, Post, Req, Res, UseGuards} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto } from './dto/auth.request.dto';
import { LocalAuthGuard } from './local/local.guard';
import { UserAccount, UserLogin } from '../response';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public, ResponseMessage } from './decorator/customize.decorator';

@Controller({
  path: 'auth',
  version: '1'
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService
  ) {}

  @Post('register')
  @ResponseMessage('Đăng ký thành công')
  @Public()
  async register(@Body() dto: RegisterRequestDto) {
    await this.authService.register(dto);

  }

  @Post('login')
  @ResponseMessage('Đăng nhập thành công')
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
      data: {
        accessToken: data.accessToken,
        user: user
      }
    };
  }

  @Post('logout')
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
        domain: isProd ? '.techzone.vn' : undefined
      });
    }
  }

  @Post('refresh')
  @ResponseMessage('Làm mới token thành công')
  @Public()
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
      domain: isProd ? '.techzone.vn' : undefined
    });

    return {
      data: {
        accessToken: data.accessToken
      }
    };
  }

}
