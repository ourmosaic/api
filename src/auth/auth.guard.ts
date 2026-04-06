import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

type RequestWithUser = Request & {
  user?: unknown;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeaderRaw = request.headers['authorization'];
    const authHeader =
      typeof authHeaderRaw === 'string' ? authHeaderRaw : undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException(
          'Invalid or missing authentication token',
        );
      }
      const payload = await this.authService.getUserFromAccessToken(token);

      if (payload) {
        request.user = payload;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid or missing authentication token');
  }
}
