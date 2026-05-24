import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { SendRequestDto } from './dto/sendRequest.dto';
import { UpdateFriendshipTypeDto } from './dto/updateType.dto';
import { UpdateFriendshipPermissionsDto } from './dto/updatePermissions.dto';
import type { FriendSystemView } from './friendship.service';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('request')
  @Version('1')
  @UseGuards(AuthGuard)
  sendFriendRequest(
    @CurrentUser() user: User,
    @Body() dto: SendRequestDto,
  ): ReturnType<FriendshipService['sendFriendRequest']> {
    return this.friendshipService.sendFriendRequest(user, dto);
  }

  @Post('respond')
  @Version('1')
  @UseGuards(AuthGuard)
  respondToFriendRequest(
    @CurrentUser() user: User,
    @Body() dto: { requestId: string; accept: boolean },
  ): ReturnType<FriendshipService['respondToFriendRequest']> {
    return this.friendshipService.respondToFriendRequest(
      user,
      dto.requestId,
      dto.accept,
    );
  }

  @Get('requests/sent')
  @Version('1')
  @UseGuards(AuthGuard)
  getFriendRequests(
    @CurrentUser() user: User,
  ): ReturnType<FriendshipService['getSentFriendRequests']> {
    return this.friendshipService.getSentFriendRequests(user);
  }

  @Get('requests/received')
  @Version('1')
  @UseGuards(AuthGuard)
  getReceivedFriendRequests(
    @CurrentUser() user: User,
  ): ReturnType<FriendshipService['getReceivedFriendRequests']> {
    return this.friendshipService.getReceivedFriendRequests(user);
  }

  @Get('list')
  @Version('1')
  @UseGuards(AuthGuard)
  getFriendsList(
    @CurrentUser() user: User,
  ): ReturnType<FriendshipService['getFriends']> {
    return this.friendshipService.getFriends(user);
  }

  @Get(':friendId/system')
  @Version('1')
  @UseGuards(AuthGuard)
  getFriendSystem(
    @CurrentUser() user: User,
    @Param('friendId') friendId: string,
  ): Promise<FriendSystemView> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
    return this.friendshipService.getFriendSystem(user, friendId);
  }

  @Patch(':friendId/permissions')
  @Version('1')
  @UseGuards(AuthGuard)
  updateFriendshipPermissions(
    @CurrentUser() user: User,
    @Param('friendId') friendId: string,
    @Body() dto: UpdateFriendshipPermissionsDto,
  ): ReturnType<FriendshipService['updateFriendshipPermissions']> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.friendshipService.updateFriendshipPermissions(
      user,
      friendId,
      dto,
    );
  }

  @Post(':id/update')
  @Version('1')
  @UseGuards(AuthGuard)
  updateFriendshipType(
    @CurrentUser() user: User,
    @Body() dto: UpdateFriendshipTypeDto,
    @Param('id') friendshipId: string,
  ): ReturnType<FriendshipService['updateFriendshipType']> {
    return this.friendshipService.updateFriendshipType(
      user,
      friendshipId,
      dto.type,
    );
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  removeFriend(
    @CurrentUser() user: User,
    @Param('id') friendId: string,
  ): ReturnType<FriendshipService['thoughtWeWereFriends']> {
    return this.friendshipService.thoughtWeWereFriends(user, friendId);
  }
}
