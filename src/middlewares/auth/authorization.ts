import { Request, Response, NextFunction } from 'express';
import { Role } from '../../schemas/user.schema';
import { ForbiddenException, UnauthorizedException } from '../formatResponse/exception/customException';

/**
 * Middleware phân quyền theo Role.
 * Phải được sử dụng SAU middleware `authenticate`.
 *
 * @param allowedRoles - Danh sách các role được phép truy cập
 *
 * @example
 * // Chỉ ADMIN mới được truy cập
 * router.get('/admin-only', authenticate, authorize(Role.ADMIN), handler);
 *
 * // Cả USER và ADMIN đều được truy cập
 * router.get('/all-users', authenticate, authorize(Role.USER, Role.ADMIN), handler);
 */
export const authorize = (...allowedRoles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const user = req.user as any;

        if (!user) {
            return next(UnauthorizedException('Bạn chưa đăng nhập'));
        }

        if (!allowedRoles.includes(user.role)) {
            return next(
                ForbiddenException(`Bạn không có quyền truy cập. Yêu cầu role: ${allowedRoles.join(', ')}`)
            );
        }

        next();
    };
};
