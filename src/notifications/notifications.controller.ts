import {
  Controller,
  MessageEvent,
  Sse,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { System as CurrentSystem } from 'src/decorators/system.decorator';
import type { System } from '@prisma/client';
import { map, merge, Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SystemInterceptor } from 'src/system/system.interceptor';
import { SSE_TOPICS } from 'src/utils/constants';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Version('1')
  @UseInterceptors(SystemInterceptor)
  streamNotifications(
    @CurrentUser('id') userId?: string,
    @CurrentSystem() system?: System,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const streams = [
      this.notificationsService
        .streamChannel(`user:${userId}:friendRequests`)
        .pipe(
          map((event) => ({
            ...event,
            data: { topic: SSE_TOPICS.FRIENDSHIP, payload: event.data },
          })),
        ),
      this.notificationsService.streamChannel('federation:frontSessions').pipe(
        map((event) => ({
          ...event,
          data: {
            topic: SSE_TOPICS.FEDERATION_FRONT_SESSIONS,
            payload: event.data,
          },
        })),
      ),
    ];

    if (system?.id) {
      streams.push(
        this.notificationsService.streamChannel(`${system.id}::sessions`).pipe(
          map((event) => ({
            ...event,
            data: { topic: SSE_TOPICS.FRONT_SESSIONS, payload: event.data },
          })),
        ),
      );
    }

    return merge(...streams);
  }

  @Sse('friendship')
  @Version('1')
  streamFriendshipNotifications(
    @CurrentUser('id') userId?: string,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return this.notificationsService.streamChannel(
      `user:${userId}:friendRequests`,
    );
  }

  @Sse('front-sessions')
  @Version('1')
  @UseInterceptors(SystemInterceptor)
  streamFrontSessionNotifications(
    @CurrentSystem() system?: System,
  ): Observable<MessageEvent> {
    if (!system) {
      throw new UnauthorizedException('Missing system context');
    }
    return this.notificationsService.streamChannel(`${system.id}::sessions`);
  }

  @Sse('federation/front-sessions')
  @Version('1')
  streamFederationFrontSessionNotifications(): Observable<MessageEvent> {
    return this.notificationsService.streamChannel('federation:frontSessions');
  }
}
