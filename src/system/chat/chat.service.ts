import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { System } from '@prisma/client';
import ErrorCodes from '../../utils/errorCodes';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getChatChannels(system: System) {
    return this.prisma.channel.findMany({
      where: { systemId: system.id },
    });
  }

  async getMessagesForChannel(
    system: System,
    channelId: string,
    limit: number,
    offset: number,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, systemId: system.id },
    });
    if (!channel) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    if (channel.systemId !== system.id) {
      throw new Error(ErrorCodes.UNAUTHORIZED);
    }
    return this.prisma.chatMessage.findMany({
      where: { channelId },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  async getLastKnownSendersForChannel(system: System, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, systemId: system.id },
    });
    if (!channel) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    if (channel.systemId !== system.id) {
      throw new Error(ErrorCodes.UNAUTHORIZED);
    }

    const lastFiveMembers = await this.prisma.chatMessage.findMany({
      where: { channelId },
      orderBy: { timestamp: 'desc' },
      distinct: ['senderId'],
      take: 5,
    });

    const senderIds = lastFiveMembers.map((msg) => msg.senderId);

    return this.prisma.member.findMany({
      where: { id: { in: senderIds } },
    });
  }

  async createChatChannel(system: System, name: string) {
    return this.prisma.channel.create({
      data: {
        name,
        systemId: system.id,
      },
    });
  }

  async deleteChatChannel(system: System, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, systemId: system.id },
    });
    if (!channel) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    if (channel.systemId !== system.id) {
      throw new Error(ErrorCodes.UNAUTHORIZED);
    }
    return this.prisma.channel.delete({
      where: { id: channelId },
    });
  }

  async sendMessageToChannel(
    system: System,
    channelId: string,
    senderId: string,
    content: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, systemId: system.id },
    });
    if (!channel) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    if (channel.systemId !== system.id) {
      throw new Error(ErrorCodes.UNAUTHORIZED);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: senderId, systemId: system.id },
    });
    if (!member) {
      throw new Error(ErrorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    return this.prisma.chatMessage.create({
      data: {
        channelId,
        senderId,
        content,
        timestamp: new Date(),
      },
    });
  }

  private async getChannelMessage(
    channelId: string,
    systemId: string,
    messageId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, systemId },
    });
    if (!channel) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    if (channel.systemId !== systemId) {
      throw new Error(ErrorCodes.UNAUTHORIZED);
    }

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, channelId },
    });
    if (!message) {
      throw new Error(ErrorCodes.CHANNEL_NOT_FOUND);
    }
    return [channel, message];
  }

  async editMessageInChannel(
    system: System,
    channelId: string,
    messageId: string,
    content: string,
  ) {
    await this.getChannelMessage(channelId, system.id, messageId);

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content },
    });
  }

  async deleteMessageInChannel(
    system: System,
    channelId: string,
    messageId: string,
  ) {
    await this.getChannelMessage(channelId, system.id, messageId);

    return this.prisma.chatMessage.delete({
      where: { id: messageId },
    });
  }
}
