import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { SubscriberModule } from './subscriber/subscriber.module';

@Module({
  providers: [RedisService],
  exports: [RedisService],
  imports: [SubscriberModule],
})
export class RedisModule {}
