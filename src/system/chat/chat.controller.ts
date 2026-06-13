import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { ChatService } from './chat.service';
import { System as Sys } from 'src/decorators/system.decorator';
import type { System } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getChatChannels(@Sys() system: System) {
    return this.chatService.getChatChannels(system);
  }

  @Get('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getMessagesForChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getMessagesForChannel(
      system,
      channelId,
      limit,
      offset,
    );
  }

  @Get('channels/:channelId/lastKnownSenders')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getLastKnownSendersForChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
  ) {
    return this.chatService.getLastKnownSendersForChannel(system, channelId);
  }

  @Post('channels')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async createChatChannel(@Sys() system: System, @Body('name') name: string) {
    return this.chatService.createChatChannel(system, name);
  }

  @Delete('channels/:channelId')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async deleteChatChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
  ) {
    return this.chatService.deleteChatChannel(system, channelId);
  }

  @Post('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async sendMessageToChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
    @Body('senderId') senderId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendMessageToChannel(
      system,
      channelId,
      senderId,
      content,
    );
  }

  @Patch('channels/:channelId/messages/:messageId')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async editMessageInChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessageInChannel(
      system,
      channelId,
      messageId,
      content,
    );
  }

  @Delete('channels/:channelId/messages/:messageId')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async deleteMessageInChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.deleteMessageInChannel(
      system,
      channelId,
      messageId,
    );
  }
}
