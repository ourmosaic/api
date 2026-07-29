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
  params?: Record<string, string>;
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
      const systemId = request.params?.sysId || request.params?.id;

      let system: System | null;

      if (systemId && systemId !== '@me') {
        // If a system ID is provided in the URL, fetch that specific system
        system = await this.prisma.system.findFirst({
          where: { id: systemId, userId: request.user.id },
        });
      } else {
        // Otherwise, fetch the root system
        system = await this.prisma.system.findFirst({
          where: { userId: request.user.id, parentSystemId: null },
        });
      }

      if (!system) {
        throw new UnauthorizedException(errorCodes.SYSTEM_NOT_FOUND);
      }
      request.system = system;
    }

    return next.handle();
  }
}
