import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('MailService', () => {
  let service: MailService;
  let configService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: unknown) => {
              if (key === 'MAIL_USER') return 'test@gmail.com';
              if (key === 'MAIL_PASS') return 'secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('nên gửi mail OTP thành công', async () => {
    const sendMailMock: any = jest.fn();
    sendMailMock.mockResolvedValue({ messageId: '123' });
    (service as any).transporter = {
      sendMail: sendMailMock,
    };

    const result = await service.sendVerificationOtp('user@ex.com', '123456', 'An');
    expect(result).toBe(true);
    expect(sendMailMock).toHaveBeenCalled();
  });

  it('nên trả về false nếu gửi mail thất bại', async () => {
    const sendMailMock: any = jest.fn();
    sendMailMock.mockRejectedValue(new Error('SMTP Error'));
    (service as any).transporter = {
      sendMail: sendMailMock,
    };

    const result = await service.sendVerificationOtp('user@ex.com', '123456', 'An');
    expect(result).toBe(false);
  });
});
