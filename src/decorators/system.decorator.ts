import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestWithSystem = {
  system?: unknown;
  systems?: unknown;
};

export const System = createParamDecorator(
  (_data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithSystem>();
    return request.systems ? request.systems[0] : request.system;
  },
);
