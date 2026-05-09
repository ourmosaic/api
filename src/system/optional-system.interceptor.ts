import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { System } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type RequestWithUserAndSystem = {
  user?: { id?: string };
  system?: System;
};

@Injectable()
export class OptionalSystemInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Promise<Observable<unknown>> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserAndSystem>();

    if (request.user?.id) {
      try {
        const system = await this.prisma.system.findUnique({
          where: { userId: request.user.id },
        });
        if (system) {
          request.system = system;
        }
      } catch {
        /* empty */
      }
    }

    return next.handle();
  }
}
