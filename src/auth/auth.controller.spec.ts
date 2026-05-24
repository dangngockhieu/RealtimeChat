import { jest } from '@jest/globals';

jest.mock('api-query-params', () => () => ({ filter: {}, sort: {}, projection: {}, population: {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UserAccount, UserLogin } from '../response';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService: any = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('development'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('nên gọi register', async () => {
    const dto = { email: 'a@ex.com', password: 'Password@123', firstName: 'A', lastName: 'B' };
    mockAuthService.register.mockResolvedValue(undefined);

    const result = await controller.register(dto);
    expect(service.register).toHaveBeenCalledWith(dto);
    expect(result).toBeNull();
  });

  it('nên gọi login và set cookie', async () => {
    const mockUser: UserLogin = {
      id: 'u1',
      email: 'a@ex.com',
      firstName: 'A',
      lastName: 'B',
      role: 'USER',
    };
    mockAuthService.login.mockResolvedValue({
      accessToken: 'access123',
      refreshToken: 'refresh123',
    });

    const mockReq: any = { user: mockUser, cookies: {} };
    const mockRes: any = { cookie: jest.fn(), clearCookie: jest.fn() };

    const result = await controller.login({ email: 'a@ex.com', password: 'p' }, mockReq, mockRes);
    expect(service.login).toHaveBeenCalledWith(mockUser);
    expect(mockRes.cookie).toHaveBeenCalled();
    expect(result.data.accessToken).toBe('access123');
  });

  it('nên gọi logout và xóa cookie', async () => {
    const mockUser: UserAccount = {
      id: 'u1',
      email: 'a@ex.com',
      role: 'USER',
    };
    mockAuthService.logout.mockResolvedValue(undefined);

    const mockReq: any = { user: mockUser, cookies: { refreshToken: 'token' } };
    const mockRes: any = { clearCookie: jest.fn() };

    const result = await controller.logout(mockReq, mockRes);
    expect(service.logout).toHaveBeenCalledWith(mockUser.id);
    expect(mockRes.clearCookie).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('nên gọi verifyOtp', async () => {
    mockAuthService.verifyOtp.mockResolvedValue(undefined);
    const dto = { email: 'test@ex.com', otp: '123456' };

    const result = await controller.verifyOtp(dto);
    expect(service.verifyOtp).toHaveBeenCalledWith(dto);
    expect(result).toBeNull();
  });

  it('nên gọi resendOtp', async () => {
    mockAuthService.resendOtp.mockResolvedValue(undefined);
    const dto = { email: 'test@ex.com' };

    const result = await controller.resendOtp(dto);
    expect(service.resendOtp).toHaveBeenCalledWith(dto);
    expect(result).toBeNull();
  });
});
