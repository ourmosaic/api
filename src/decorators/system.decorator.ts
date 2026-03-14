import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const System = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.system;
  },
);