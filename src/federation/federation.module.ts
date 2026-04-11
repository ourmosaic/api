import { forwardRef, Module } from '@nestjs/common';
import { FederationService } from './federation.service';
import { FederationController } from './federation.controller';
import { MembersModule } from 'src/system/members/members.module';
import { SystemModule } from 'src/system/system.module';
import { GroupsModule } from 'src/system/groups/groups.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { FriendshipModule } from 'src/friendship/friendship.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/storage/storage.module';
import { SubscriberModule } from 'src/redis/subscriber/subscriber.module';
import { BullModule } from '@nestjs/bullmq';
import { FederationProcessor } from './federation.processor';

@Module({
  imports: [
    forwardRef(() => MembersModule),
    forwardRef(() => SystemModule),
    forwardRef(() => GroupsModule),
    AuthModule,
    UsersModule,
    forwardRef(() => FriendshipModule),
    PrismaModule,
    StorageModule,
    SubscriberModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
      },
    }),
    BullModule.registerQueue({
      name: 'federation_outgoing',
    }),
  ],
  providers: [FederationService, FederationProcessor],
  controllers: [FederationController],
  exports: [FederationService],
})
export class FederationModule {}
