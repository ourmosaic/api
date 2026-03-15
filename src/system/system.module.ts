import { forwardRef, Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MembersModule } from './members/members.module';
import { GroupsModule } from './groups/groups.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => MembersModule), forwardRef(() => GroupsModule), StorageModule],
  providers: [SystemService],
  controllers: [SystemController],
  exports: [SystemService]
})
export class SystemModule {}
