import {
  BadRequestException,
  NotFoundException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  FriendshipStatus,
  FriendshipType,
  type System,
  type User as UserType,
} from '@prisma/client';
import {
  FederationMessageType,
  FriendAcceptMessage,
  FriendRejectMessage,
  FriendRequestMessage,
} from 'src/federation/federationDef';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { REDIS_EVENTS } from 'src/utils/constants';
import errorCodes from 'src/utils/errorCodes';
import { SendRequestDto } from './dto/sendRequest.dto';
import { FederationService } from 'src/federation/federation.service';
import type { MemberWithGroups } from 'src/system/members/members.service';

export type FriendshipPermissions = {
  canViewFront: boolean;
  canReceiveFrontNotifications: boolean;
  canViewSharedMembers: boolean;
  notifyMeOnFriendFrontChange: boolean;
};

type FriendshipWithPermissions = FriendshipPermissions & {
  id: string;
  userOneId: string;
  userTwoId: string;
  status: FriendshipStatus;
};

export type FriendSystemView = {
  id: string;
  customName: string | null;
  avatarUrl: string | null;
  description: string | null;
  color: string | null;
  frontPrivacy: System['frontPrivacy'];
  permissions: Omit<FriendshipPermissions, 'notifyMeOnFriendFrontChange'>;
  frontMember: MemberWithGroups | null;
  members: MemberWithGroups[];
};

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
      if (!dto.username) {
        throw new BadRequestException(errorCodes.INVALID_FRIEND_REQUEST);
      }
      if (!dto.federationUrl) {
        const recipient = await this.prisma.user.findUnique({
          where: { username: dto.username },
        });
        if (!recipient) {
          throw new BadRequestException(errorCodes.INVALID_FRIEND_REQUEST);
        }
        if (recipient.id === sender.id) {
          throw new BadRequestException(errorCodes.CANNOT_FRIEND_SELF);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.sendFriendRequest(sender, {
          ...dto,
          recipientId: recipient.id,
        });
      }
      const message: FriendRequestMessage = {
        type: FederationMessageType.FRIEND_REQUEST,
        timestamp: Date.now(),
        distantId: sender.id,
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
        userTwoId: dto.recipientId,
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
    const requestSender = await this.prisma.user.findUnique({
      where: { id: request.userOneId },
    });

    const shouldNotifyFederation =
      Boolean(requestSender?.isFederated) && Boolean(requestSender?.domain);

    if (shouldNotifyFederation) {
      const baseMessage = {
        timestamp: Date.now(),
        targetFederation: requestSender!.domain!,
        distantId: user.id,
        senderUsername: user.username,
        recipientUsername: requestSender!.username,
      };
      if (accept) {
        const message: FriendAcceptMessage = {
          ...baseMessage,
          type: FederationMessageType.FRIEND_ACCEPT,
        };
        await this.federationService.enqueueMessage(message);
      } else {
        const message: FriendRejectMessage = {
          ...baseMessage,
          type: FederationMessageType.FRIEND_REJECT,
        };
        await this.federationService.enqueueMessage(message);
      }
    }

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
      include: {
        userOne: {
          select: {
            id: true,
            username: true,
            system: true,
            isSystem: true,
          },
        },
        userTwo: {
          select: {
            id: true,
            username: true,
            system: true,
            isSystem: true,
          },
        },
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

  async updateFriendshipPermissions(
    user: UserType,
    friendId: string,
    permissions: Partial<FriendshipPermissions>,
  ): Promise<Record<string, unknown> | null> {
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

    const data: Record<string, boolean> = {};
    if (permissions.canViewFront !== undefined) {
      data.canViewFront = permissions.canViewFront;
    }
    if (permissions.canReceiveFrontNotifications !== undefined) {
      data.canReceiveFrontNotifications =
        permissions.canReceiveFrontNotifications;
    }
    if (permissions.canViewSharedMembers !== undefined) {
      data.canViewSharedMembers = permissions.canViewSharedMembers;
    }
    if (permissions.notifyMeOnFriendFrontChange !== undefined) {
      data.notifyMeOnFriendFrontChange =
        permissions.notifyMeOnFriendFrontChange;
    }

    await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: data as never,
    });

    return this.prisma.friendship.findUnique({ where: { id: friendship.id } });
  }

  async getFriendSystem(
    user: UserType,
    friendId: string,
  ): Promise<FriendSystemView> {
    const friendship = (await this.prisma.friendship.findFirst({
      where: {
        userOneId: friendId,
        userTwoId: user.id,
        status: FriendshipStatus.ACCEPTED,
      },
    })) as FriendshipWithPermissions | null;

    if (!friendship) {
      throw new BadRequestException(errorCodes.FRIENDSHIP_NOT_FOUND);
    }

    const system = await this.prisma.system.findUnique({
      where: { userId: friendId },
    });

    if (!system) {
      throw new NotFoundException(errorCodes.USER_HAS_NO_SYSTEM);
    }

    const [frontSession, members] = await Promise.all([
      friendship.canViewFront
        ? this.prisma.frontSession.findFirst({
            where: {
              systemId: system.id,
              endTime: null,
            },
            orderBy: {
              startTime: 'asc',
            },
            include: {
              member: {
                include: {
                  groups: true,
                },
              },
            },
          })
        : Promise.resolve(null),
      friendship.canViewSharedMembers
        ? this.prisma.member.findMany({
            where: {
              systemId: system.id,
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            include: {
              groups: true,
            },
          })
        : Promise.resolve([] as MemberWithGroups[]),
    ]);

    return {
      id: system.id,
      customName: system.customName,
      avatarUrl: system.avatarUrl,
      description: system.description,
      color: system.color,
      frontPrivacy: system.frontPrivacy,
      permissions: {
        canViewFront: friendship.canViewFront,
        canReceiveFrontNotifications: friendship.canReceiveFrontNotifications,
        canViewSharedMembers: friendship.canViewSharedMembers,
      },
      frontMember: frontSession?.member ?? null,
      members,
    };
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
