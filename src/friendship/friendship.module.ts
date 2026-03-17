import { forwardRef, Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';
import { FederationModule } from 'src/federation/federation.module';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, forwardRef(() => FederationModule)],
  providers: [FriendshipService],
  controllers: [FriendshipController],
  exports: [FriendshipService]
})
export class FriendshipModule {}
