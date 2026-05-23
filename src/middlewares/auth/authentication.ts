import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedException } from '../formatResponse/exception/customException';

/**
 * Middleware xác thực JWT thông qua Passport.
 * Gắn user vào req.user nếu token hợp lệ.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
        if (err) return next(err);

        if (!user) {
            const message = info?.message || 'Token không hợp lệ hoặc đã hết hạn';
            return next(UnauthorizedException(message));
        }

        req.user = user;
        next();
    })(req, res, next);
};