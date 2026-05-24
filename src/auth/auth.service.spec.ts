jest.mock('argon2');
jest.mock('api-query-params', () => () => ({ filter: {}, sort: {}, projection: {}, population: {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../modules/mail/mail.service';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let jwtService: any;
  let configService: any;
  let mailService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            getUserByEmailWithPassword: jest.fn(),
            getUserByEmail: jest.fn(),
            createUser: jest.fn(),
            createUserWithOtp: jest.fn(),
            getUserByEmailWithOtp: jest.fn(),
            activateUser: jest.fn(),
            updateOtp: jest.fn(),
            updateRefreshToken: jest.fn(),
            getUserWithRefreshTokenById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mockToken'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mockSecret'),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationOtp: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    mailService = module.get<MailService>(MailService);
  });

  describe('validateUser', () => {
    it('nên ném NotFoundException nếu không tìm thấy email', async () => {
      userService.getUserByEmailWithPassword.mockResolvedValue(null);

      await expect(service.validateUser('notfound@ex.com', 'pass')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném ForbiddenException nếu tài khoản chưa kích hoạt', async () => {
      userService.getUserByEmailWithPassword.mockResolvedValue({
        isActive: false,
      });

      await expect(service.validateUser('inactive@ex.com', 'pass')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('nên ném UnauthorizedException nếu sai mật khẩu', async () => {
      userService.getUserByEmailWithPassword.mockResolvedValue({
        isActive: true,
        password: 'hash',
      });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@ex.com', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('nên trả về UserLogin nếu thông tin đăng nhập đúng', async () => {
      userService.getUserByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'test@ex.com',
        firstName: 'An',
        lastName: 'Nguyen',
        role: 'USER',
        isActive: true,
        password: 'hash',
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);

      const user = await service.validateUser('test@ex.com', 'correctpass');
      expect(user).toBeDefined();
      expect(user.id).toBe('u1');
    });
  });

  describe('register', () => {
    it('nên ném ForbiddenException nếu email đã tồn tại', async () => {
      userService.getUserByEmail.mockResolvedValue({ id: 'u1' });

      await expect(
        service.register({
          email: 'exist@ex.com',
          password: 'pass',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên tạo tài khoản kèm OTP và gửi email thành công', async () => {
      userService.getUserByEmail.mockRejectedValue(new NotFoundException());
      userService.createUserWithOtp.mockResolvedValue(undefined);

      await service.register({
        email: 'new@ex.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      });

      expect(userService.createUserWithOtp).toHaveBeenCalled();
      expect(mailService.sendVerificationOtp).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('nên ném NotFoundException nếu email không tồn tại', async () => {
      userService.getUserByEmailWithOtp.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ email: 'notfound@ex.com', otp: '123456' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên ném BadRequestException nếu tài khoản đã kích hoạt', async () => {
      userService.getUserByEmailWithOtp.mockResolvedValue({ isActive: true });

      await expect(
        service.verifyOtp({ email: 'active@ex.com', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên kích hoạt tài khoản thành công nếu OTP đúng', async () => {
      userService.getUserByEmailWithOtp.mockResolvedValue({
        _id: 'u1',
        isActive: false,
        otpCode: '123456',
        otpExpired: new Date(Date.now() + 60000),
      });
      userService.activateUser.mockResolvedValue(undefined);

      await service.verifyOtp({ email: 'user@ex.com', otp: '123456' });
      expect(userService.activateUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('resendOtp', () => {
    it('nên gửi lại OTP thành công', async () => {
      userService.getUserByEmailWithOtp.mockResolvedValue({
        _id: 'u1',
        isActive: false,
        firstName: 'An',
      });
      userService.updateOtp.mockResolvedValue(undefined);

      await service.resendOtp({ email: 'user@ex.com' });
      expect(userService.updateOtp).toHaveBeenCalled();
      expect(mailService.sendVerificationOtp).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('nên trả về accessToken và refreshToken', async () => {
      userService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login({
        id: 'u1',
        email: 'test@ex.com',
        firstName: 'A',
        lastName: 'B',
        role: 'USER',
      });

      expect(result.accessToken).toBe('mockToken');
      expect(result.refreshToken).toBe('mockToken');
      expect(userService.updateRefreshToken).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('nên xóa refreshToken trong DB', async () => {
      userService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('u1');
      expect(userService.updateRefreshToken).toHaveBeenCalledWith('u1', null);
    });
  });
});
