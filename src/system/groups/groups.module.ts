import { forwardRef, Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { MembersModule } from '../members/members.module';
import { SystemModule } from '../system.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    forwardRef(() => MembersModule),
    forwardRef(() => SystemModule),
    PrismaModule,
    AuthModule,
  ],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService],
})
export class GroupsModule {}
