import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { SystemModule } from 'src/system/system.module';
import { GroupsModule } from 'src/system/groups/groups.module';
import { StorageModule } from 'src/storage/storage.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    SystemModule,
    GroupsModule,
    StorageModule,
    RedisModule,
    AuthModule,
  ],
  providers: [ImportService],
  controllers: [ImportController],
})
export class ImportModule {}
