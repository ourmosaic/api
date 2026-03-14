import { forwardRef, Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { SystemModule } from '../system.module';

@Module({
  imports: [forwardRef(() => SystemModule)],
  controllers: [MembersController],
  providers: [MembersService]
})
export class MembersModule {}
