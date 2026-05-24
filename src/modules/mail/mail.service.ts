import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  async sendVerificationOtp(toEmail: string, otp: string, firstName: string): Promise<boolean> {
    const user = this.configService.get<string>('MAIL_USER');
    if (!user) {
      this.logger.warn(`MAIL_USER chưa được cấu hình. Giả lập gửi OTP: ${otp} tới ${toEmail}`);
      return true;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; text-align: center;">Xác thực tài khoản Chat Message</h2>
        <p>Xin chào <strong>${firstName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP dưới đây để kích hoạt tài khoản của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2b6cb0; background-color: #edf2f7; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="color: #718096; font-size: 14px;">Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không phản hồi lại email này.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Chat Message Support" <${user}>`,
        to: toEmail,
        subject: `[Chat Message] Mã xác thực kích hoạt tài khoản: ${otp}`,
        html: htmlContent,
      });
      this.logger.log(`Đã gửi email OTP thành công tới: ${toEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Gửi email OTP thất bại tới ${toEmail}: ${error.message}`);
      return false;
    }
  }
}
