import { Request, Response, NextFunction } from 'express';
import { CustomError } from './customException';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Bỏ qua nếu response đã được gửi (trường hợp hiếm)
  if (res.headersSent) {
    return _next(err);
  }

  // Phân tích lỗi theo định dạng đã tạo ở customException
  const isCustom = err.isCustomException;
  const statusCode = isCustom ? err.statusCode : err.status || 500;
  const message = isCustom ? err.message : err.message || 'Internal Server Error';

  // In log lõi hệ thống (tuỳ chọn)
  if (!isCustom) {
    console.error('[System Error]:', err);
  }

  // Phản hồi định dạng chuẩn
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  });
};