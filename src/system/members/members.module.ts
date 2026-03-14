import { forwardRef, Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { SystemModule } from '../system.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [forwardRef(() => SystemModule), PrismaModule, AuthModule, RedisModule],
  controllers: [MembersController],
  providers: [MembersService]
})
export class MembersModule {}
