import * as express from 'express';

declare global {
  namespace Express {
    interface Response {
      customSuccess<T>(data?: T, message?: string, statusCode?: number): void;
    }
  }
}