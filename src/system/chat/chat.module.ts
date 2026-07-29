import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { SystemModule } from '../system.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [PrismaModule, AuthModule, forwardRef(() => SystemModule)],
})
export class ChatModule {}
