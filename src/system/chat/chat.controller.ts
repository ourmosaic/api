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
  Version,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { ChatService } from './chat.service';
import { System as Sys } from 'src/decorators/system.decorator';
import type { System, User } from '@prisma/client';
import { SystemService } from '../system.service';
import { CurrentUser } from '../../decorators/current-user.decorator';

@Controller(['chat', 'system/:id/chat'])
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly systemService: SystemService,
  ) {}

  @Get('channels')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('1')
  async getChatChannels(@Sys() system: System) {
    return this.chatService.getChatChannels(system);
  }

  @Get('channels')
  @UseGuards(AuthGuard)
  @Version('2')
  async getChatChannels2(@Param('id') systemId: string, @CurrentUser() user: User) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.chatService.getChatChannels(system);
  }

  @Get('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('1')
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

  @Get('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @Version('2')
  async getMessagesForChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
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
  @Version('1')
  async getLastKnownSendersForChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
  ) {
    return this.chatService.getLastKnownSendersForChannel(system, channelId);
  }

  @Get('channels/:channelId/lastKnownSenders')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('2')
  async getLastKnownSendersForChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.chatService.getLastKnownSendersForChannel(system, channelId);
  }

  @Post('channels')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('1')
  async createChatChannel(@Sys() system: System, @Body('name') name: string) {
    return this.chatService.createChatChannel(system, name);
  }

  @Post('channels')
  @UseGuards(AuthGuard)
  @Version('2')
  async createChatChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Body('name') name: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.chatService.createChatChannel(system, name);
  }

  @Delete('channels/:channelId')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('1')
  async deleteChatChannel(
    @Sys() system: System,
    @Param('channelId') channelId: string,
  ) {
    return this.chatService.deleteChatChannel(system, channelId);
  }

  @Delete('channels/:channelId')
  @UseGuards(AuthGuard)
  @Version('2')
  async deleteChatChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.chatService.deleteChatChannel(system, channelId);
  }

  @Post('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  @Version('1')
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

  @Post('channels/:channelId/messages')
  @UseGuards(AuthGuard)
  @Version('2')
  async sendMessageToChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
    @Body('senderId') senderId: string,
    @Body('content') content: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
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
  @Version('1')
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

  @Patch('channels/:channelId/messages/:messageId')
  @UseGuards(AuthGuard)
  @Version('2')
  async editMessageInChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
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
  @Version('1')
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

  @Delete('channels/:channelId/messages/:messageId')
  @UseGuards(AuthGuard)
  @Version('2')
  async deleteMessageInChannel2(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.chatService.deleteMessageInChannel(
      system,
      channelId,
      messageId,
    );
  }
}
