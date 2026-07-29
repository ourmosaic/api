import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SubscriberModule } from 'src/redis/subscriber/subscriber.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SystemModule } from 'src/system/system.module';

@Module({
  imports: [SubscriberModule, AuthModule, PrismaModule, SystemModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
