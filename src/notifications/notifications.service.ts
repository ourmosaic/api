import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { SubscriberService } from 'src/redis/subscriber/subscriber.service';
import { Observable } from 'rxjs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly subscriber: SubscriberService) {}

  streamChannel(channel: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const streamClient = this.subscriber.duplicate();
      const keepAlive = setInterval(() => {
        observer.next({ type: 'keepalive', data: { channel } });
      }, 20_000);

      const onMessage = (incomingChannel: string, rawPayload: string) => {
        if (incomingChannel !== channel) {
          return;
        }
        observer.next({
          type: 'notification',
          data: this.parsePayload(rawPayload),
        });
      };

      const onError = (error: unknown) => {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        this.logger.error(
          `Redis stream error on channel ${channel}: ${message}`,
        );
      };

      streamClient.on('message', onMessage);
      streamClient.on('error', onError);

      streamClient
        .subscribe(channel)
        .then(() => {
          observer.next({ type: 'ready', data: { channel } });
        })
        .catch((error: unknown) => {
          observer.error(error);
        });

      return () => {
        clearInterval(keepAlive);
        streamClient.off('message', onMessage);
        streamClient.off('error', onError);
        streamClient
          .unsubscribe(channel)
          .catch(() => undefined)
          .finally(() => {
            streamClient.quit().catch(() => streamClient.disconnect());
          });
      };
    });
  }

  private parsePayload(payload: string): object {
    try {
      return JSON.parse(payload) as object;
    } catch {
      return { raw: payload };
    }
  }
}
