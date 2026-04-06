import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import errorCodes from 'src/utils/errorCodes';

@Injectable()
export class SystemInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
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
