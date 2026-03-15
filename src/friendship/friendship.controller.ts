import { Body, Controller, Delete, Get, Param, Post, UseGuards, Version } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { SendRequestDto } from './dto/sendRequest.dto';
import { UpdateFriendshipTypeDto } from './dto/updateType.dto';

@Controller('friendship')
export class FriendshipController {
    constructor(
        private readonly friendshipService: FriendshipService
    ) {}

    @Post('request')
    @Version('1')
    @UseGuards(AuthGuard)
    async sendFriendRequest(@CurrentUser() user: User, @Body() dto: SendRequestDto) {
        return this.friendshipService.sendFriendRequest(user, dto.recipientId);
    }

    @Post('respond')
    @Version('1')
    @UseGuards(AuthGuard)
    async respondToFriendRequest(@CurrentUser() user: User, @Body() dto: { requestId: string, accept: boolean }) {
        return this.friendshipService.respondToFriendRequest(user, dto.requestId, dto.accept);
    }

    @Get('requests/sent')
    @Version('1')
    @UseGuards(AuthGuard)
    async getFriendRequests(@CurrentUser() user: User) {
        return this.friendshipService.getSentFriendRequests(user);
    }

    @Get('requests/received')
    @Version('1')
    @UseGuards(AuthGuard)
    async getReceivedFriendRequests(@CurrentUser() user: User) {
        return this.friendshipService.getReceivedFriendRequests(user);
    }

    @Get('list')
    @Version('1')
    @UseGuards(AuthGuard)
    async getFriendsList(@CurrentUser() user: User) {
        return this.friendshipService.getFriends(user);
    }

    @Post(':id/update')
    @Version('1')
    @UseGuards(AuthGuard)
    async updateFriendshipType(@CurrentUser() user: User, @Body() dto: UpdateFriendshipTypeDto, @Param('id') friendshipId: string) {
        return this.friendshipService.updateFriendshipType(user, friendshipId, dto.type);
    }

    @Delete(':id')
    @Version('1')
    @UseGuards(AuthGuard)
    async removeFriend(@CurrentUser() user: User, @Param('id') friendId: string) {
        return this.friendshipService.thoughtWeWereFriends(user, friendId);
    }
}
