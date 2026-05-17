
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserAccount } from '../../response';

export const User = createParamDecorator(
  (data: UserAccount, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
