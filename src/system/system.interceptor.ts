import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { System } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import errorCodes from 'src/utils/errorCodes';

type RequestWithUserAndSystem = {
  user?: { id?: string };
  system?: System;
};

@Injectable()
export class SystemInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Promise<Observable<unknown>> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserAndSystem>();
    if (request.user?.id) {
      const system = await this.prisma.system.findUnique({
        where: { userId: request.user.id },
      });

      if (!system) {
        throw new UnauthorizedException(errorCodes.SYSTEM_NOT_FOUND);
      }
      request.system = system;
    }

    return next.handle();
  }
}
