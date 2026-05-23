import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedException } from '../formatResponse/exception/customException';

export const authenticateLocal = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) return next(UnauthorizedException(info?.message || 'Sai thông tin đăng nhập'));
        req.user = user;
        next();
    })(req, res, next);
};