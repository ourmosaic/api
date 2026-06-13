import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [PrismaModule, AuthModule],
})
export class ChatModule {}
