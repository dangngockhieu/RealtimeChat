import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { BadRequestException } from '../formatResponse/exception/customException';

export const validateDto = (dtoClass: any) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const instance = plainToInstance(dtoClass, req.body);
        const errors = await validate(instance);

        if (errors.length > 0) {
            const messages = errors.map((error: ValidationError) => {
                return Object.values(error.constraints || {}).join(', ');
            });
            next(BadRequestException(messages.join('. ')));
        } else {
            req.body = instance;
            next();
        }
    };
};
