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
import { map, merge, Observable, timer } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SystemInterceptor } from 'src/system/system.interceptor';
import { OptionalSystemInterceptor } from 'src/system/optional-system.interceptor';
import { SSE_KEEPALIVE_INTERVAL_MS, SSE_TOPICS } from 'src/utils/constants';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private keepAlive(scope: string): Observable<MessageEvent> {
    return timer(0, SSE_KEEPALIVE_INTERVAL_MS).pipe(
      map(() => ({
        type: 'keepalive',
        data: { scope, timestamp: new Date().toISOString() },
      })),
    );
  }

  private topicStream(
    channel: string,
    topic: string,
  ): Observable<MessageEvent> {
    return this.notificationsService.streamChannel(channel).pipe(
      map((event) => ({
        ...event,
        data: { topic, payload: event.data },
      })),
    );
  }

  private mergeStreams(
    scope: string,
    streams: Observable<MessageEvent>[],
  ): Observable<MessageEvent> {
    return merge(...streams, this.keepAlive(scope));
  }

  @Sse()
  @Version('1')
  @UseInterceptors(OptionalSystemInterceptor)
  streamRootNotifications(
    @CurrentUser('id') userId?: string,
    @CurrentSystem() system?: System,
  ): Observable<MessageEvent> {
    return this.buildGlobalNotificationsStream(userId, system);
  }

  @Sse('stream')
  @Version('1')
  @UseInterceptors(OptionalSystemInterceptor)
  streamNotifications(
    @CurrentUser('id') userId?: string,
    @CurrentSystem() system?: System,
  ): Observable<MessageEvent> {
    return this.buildGlobalNotificationsStream(userId, system);
  }

  private buildGlobalNotificationsStream(
    userId?: string,
    system?: System,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const streams = [
      this.topicStream(`user:${userId}:friendRequests`, SSE_TOPICS.FRIENDSHIP),
      this.topicStream(`user:${userId}:frontChanges`, SSE_TOPICS.FRONT_CHANGES),
      this.topicStream(
        `user:${userId}:friendFrontSessions`,
        SSE_TOPICS.FRIEND_FRONT_SESSIONS,
      ),
      this.topicStream(
        'federation:frontSessions',
        SSE_TOPICS.FEDERATION_FRONT_SESSIONS,
      ),
      this.topicStream(`user:${userId}:imports`, SSE_TOPICS.IMPORT),
    ];

    if (system?.id) {
      streams.push(
        this.topicStream(`${system.id}::sessions`, SSE_TOPICS.FRONT_SESSIONS),
      );
    }

    return this.mergeStreams('notifications:global', streams);
  }

  @Sse('user')
  @Version('1')
  streamUserNotifications(
    @CurrentUser('id') userId?: string,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const streams = [
      this.topicStream(`user:${userId}:friendRequests`, SSE_TOPICS.FRIENDSHIP),
      this.topicStream(`user:${userId}:frontChanges`, SSE_TOPICS.FRONT_CHANGES),
      this.topicStream(`user:${userId}:imports`, SSE_TOPICS.IMPORT),
    ];

    return this.mergeStreams('notifications:user', streams);
  }

  @Sse('friendship')
  @Version('1')
  streamFriendshipNotifications(
    @CurrentUser('id') userId?: string,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return this.mergeStreams('notifications:friendship', [
      this.notificationsService.streamChannel(`user:${userId}:friendRequests`),
    ]);
  }

  @Sse('front-changes')
  @Version('1')
  streamFrontChangeNotifications(
    @CurrentUser('id') userId?: string,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    return this.mergeStreams('notifications:front-changes', [
      this.topicStream(`user:${userId}:frontChanges`, SSE_TOPICS.FRONT_CHANGES),
    ]);
  }

  @Sse('friend-front-sessions')
  @Version('1')
  streamFriendFrontSessions(
    @CurrentUser('id') userId?: string,
  ): Observable<MessageEvent> {
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    return this.mergeStreams('notifications:friend-front-sessions', [
      this.topicStream(
        `user:${userId}:friendFrontSessions`,
        SSE_TOPICS.FRIEND_FRONT_SESSIONS,
      ),
    ]);
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
    return this.mergeStreams('notifications:front-sessions', [
      this.notificationsService.streamChannel(`${system.id}::sessions`),
    ]);
  }

  @Sse('system')
  @Version('1')
  @UseInterceptors(SystemInterceptor)
  streamSystemNotifications(
    @CurrentSystem() system?: System,
  ): Observable<MessageEvent> {
    if (!system) {
      throw new UnauthorizedException('Missing system context');
    }
    return this.mergeStreams('notifications:system', [
      this.topicStream(`${system.id}::sessions`, SSE_TOPICS.FRONT_SESSIONS),
    ]);
  }

  @Sse('federation/front-sessions')
  @Version('1')
  streamFederationFrontSessionNotifications(): Observable<MessageEvent> {
    return this.mergeStreams('notifications:federation-front-sessions', [
      this.notificationsService.streamChannel('federation:frontSessions'),
    ]);
  }
}
