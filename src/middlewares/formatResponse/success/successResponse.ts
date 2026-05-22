import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Response {
      customSuccess<T>(data?: T, message?: string, statusCode?: number): void;
    }
  }
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
}

export const responseFormatter = (req: Request, res: Response, next: NextFunction): void => {
  res.customSuccess = function <T>(data?: T, message = 'Success', statusCode = 200): void {
    const responseBody: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== undefined && data !== null) {
      responseBody.data = data;
    }

    res.status(statusCode).json(responseBody);
  };
  next();
};