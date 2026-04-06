import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestWithSystem = {
  system?: unknown;
};

export const System = createParamDecorator(
  (_data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithSystem>();
    return request.system;
  },
);
