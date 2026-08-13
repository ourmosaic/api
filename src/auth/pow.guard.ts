import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class PowGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeaderRaw = request.headers['x-pow-token'];
    const authHeader =
      typeof authHeaderRaw === 'string' ? authHeaderRaw : undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Invalid or missing PoW token.');
      }

      const decoded: { sub: string } = this.jwtService.verifyAccessToken(
        token,
      ) as { sub: string };
      const payload = await this.redisService.get(
        `${this.authService.redisPrefix}pow:solution:${decoded.sub}`,
      );

      if (payload) {
        return true;
      }
    }

    throw new UnauthorizedException('Invalid or missing PoW token.');
  }
}
