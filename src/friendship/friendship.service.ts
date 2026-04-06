import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  FriendshipStatus,
  FriendshipType,
  type User as UserType,
} from '@prisma/client';
import {
  FederationMessageType,
  FriendRequestMessage,
} from 'src/federation/federationDef';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { REDIS_EVENTS } from 'src/utils/constants';
import errorCodes from 'src/utils/errorCodes';
import { SendRequestDto } from './dto/sendRequest.dto';
import { FederationService } from 'src/federation/federation.service';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => FederationService))
    private readonly federationService: FederationService,
  ) {}

  async sendFriendRequest(sender: UserType, dto: SendRequestDto) {
    if (!dto.recipientId) {
      if (!dto.federationUrl || !dto.username) {
        throw new BadRequestException(errorCodes.INVALID_FRIEND_REQUEST);
      }
      const message: FriendRequestMessage = {
        type: FederationMessageType.FRIEND_REQUEST,
        timestamp: Date.now(),
        senderUsername: sender.username,
        recipientUsername: dto.username,
        targetFederation: dto.federationUrl,
      };
      await this.federationService.enqueueMessage(message);
      return {
        message: 'Friend request sent to federation. Awaiting response...',
      };
    }
    if (dto.recipientId === sender.id) {
      throw new BadRequestException(errorCodes.CANNOT_FRIEND_SELF);
    }
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) {
      throw new BadRequestException(errorCodes.INVALID_USER_ID);
    }
    const existingRelation = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            userOneId: sender.id,
            userTwoId: dto.recipientId,
            status: {
              in: [FriendshipStatus.PENDING, FriendshipStatus.ACCEPTED],
            },
          },
          {
            userOneId: dto.recipientId,
            userTwoId: sender.id,
            status: {
              in: [FriendshipStatus.PENDING, FriendshipStatus.ACCEPTED],
            },
          },
        ],
      },
    });
    if (existingRelation) {
      throw new BadRequestException(
        errorCodes.FRIENDSHIP_ALREADY_EXISTS_OR_PENDING,
      );
    }
    const request = await this.prisma.friendship.create({
      data: {
        userOneId: sender.id,
        userTwoId: dto.recipientId!,
        status: FriendshipStatus.PENDING,
      },
    });
    await this.redis.publish(
      `user:${dto.recipientId}:friendRequests`,
      JSON.stringify({ type: REDIS_EVENTS.NEW_FRIEND_REQUEST, request }),
    );
    return request;
  }

  async respondToFriendRequest(
    user: UserType,
    requestId: string,
    accept: boolean,
  ) {
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });
    if (
      !request ||
      request.userTwoId !== user.id ||
      request.status !== FriendshipStatus.PENDING
    ) {
      throw new BadRequestException(errorCodes.FRIENDSHIP_REQUEST_NOT_FOUND);
    }
    const newStatus = accept
      ? FriendshipStatus.ACCEPTED
      : FriendshipStatus.REJECTED;
    if (!accept) {
      await this.prisma.friendship.delete({ where: { id: requestId } });
      await this.redis.publish(
        `user:${request.userOneId}:friendRequests`,
        JSON.stringify({
          type: REDIS_EVENTS.FRIENDSHIP_REMOVED,
          userId: user.id,
        }),
      );
      return { requestId, status: FriendshipStatus.REJECTED };
    }
    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: newStatus },
    });
    if (accept) {
      await this.prisma.friendship.create({
        data: {
          userOneId: user.id,
          userTwoId: request.userOneId,
          status: FriendshipStatus.ACCEPTED,
        },
      });
    }
    await this.redis.publish(
      `user:${request.userOneId}:friendRequests`,
      JSON.stringify({
        type: REDIS_EVENTS.FRIENDSHIP_REQUEST_UPDATED,
        requestId,
        status: newStatus,
      }),
    );
    return { requestId, status: newStatus };
  }

  async thoughtWeWereFriends(user: UserType, friendId: string) {
    const friendship = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userOneId: user.id, userTwoId: friendId },
          { userOneId: friendId, userTwoId: user.id },
        ],
      },
    });
    if (!friendship || friendship.length === 0) {
      throw new BadRequestException(errorCodes.FRIENDSHIP_NOT_FOUND);
    }
    await this.prisma.friendship.deleteMany({
      where: { OR: friendship.map((f) => ({ id: f.id })) },
    });
    await this.redis.publish(
      `user:${friendId}:friendRequests`,
      JSON.stringify({
        type: REDIS_EVENTS.FRIENDSHIP_REMOVED,
        userId: user.id,
      }),
    );
    return { message: 'Friendship removed. Farewell, space cowboy...' };
  }

  async getFriends(user: UserType) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userOneId: user.id, status: FriendshipStatus.ACCEPTED },
          { userTwoId: user.id, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });
    const friendIds = friendships.map((f) =>
      f.userOneId === user.id ? f.userTwoId : f.userOneId,
    );
    return this.prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, username: true, system: true, isSystem: true },
    });
  }

  async updateFriendshipType(
    user: UserType,
    friendId: string,
    type: FriendshipType,
  ) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        userOneId: user.id,
        userTwoId: friendId,
        status: FriendshipStatus.ACCEPTED,
      },
    });
    if (!friendship) {
      throw new BadRequestException(errorCodes.FRIENDSHIP_NOT_FOUND);
    }
    await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { type },
    });
    await this.redis.publish(
      `user:${friendId}:friendRequests`,
      JSON.stringify({
        type: REDIS_EVENTS.FRIENDSHIP_UPDATED,
        userId: user.id,
        friendshipType: type,
      }),
    );
    return this.prisma.friendship.findUnique({ where: { id: friendship.id } });
  }

  async getSentFriendRequests(user: UserType) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        userOneId: user.id,
        status: FriendshipStatus.PENDING,
      },
      include: {
        userTwo: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    return requests.map((req) => ({
      id: req.id,
      recipient: req.userTwo,
      status: req.status,
      createdAt: req.createdAt,
    }));
  }

  async getReceivedFriendRequests(user: UserType) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        userTwoId: user.id,
        status: FriendshipStatus.PENDING,
      },
      include: {
        userOne: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    return requests.map((req) => ({
      id: req.id,
      sender: req.userOne,
      status: req.status,
      createdAt: req.createdAt,
    }));
  }
}
