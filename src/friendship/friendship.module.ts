import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  providers: [FriendshipService],
  controllers: [FriendshipController]
})
export class FriendshipModule {}
