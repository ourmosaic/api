import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import argon2id from 'argon2';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import errorCodes from 'src/utils/errorCodes';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export type UserActiveFrontSession = {
  sessionId: string;
  startTime: Date;
  member: {
    id: string;
    name: string;
    systemId: string;
  };
  system: {
    id: string;
    customName: string | null;
  };
};

const userPrivateSelect = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  isFederated: true,
  domain: true,
  isSystem: true,
};

const userPublicSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  isFederated: true,
  domain: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPrivateSelect,
    });

    if (!user) {
      throw new NotFoundException(errorCodes.USER_NOT_FOUND);
    }

    return user;
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException(errorCodes.USER_NOT_FOUND);
    }

    return user;
  }

  async getActiveFrontSessionsByUserId(
    userId: string,
    requesterId: string,
  ): Promise<UserActiveFrontSession[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(errorCodes.USER_NOT_FOUND);
    }

    if (requesterId !== userId) {
      const friendship = await this.prisma.friendship.findFirst({
        where: {
          userOneId: userId,
          userTwoId: requesterId,
          status: FriendshipStatus.ACCEPTED,
          canViewFront: true,
        },
        select: { id: true },
      });

      if (!friendship) {
        throw new ForbiddenException(errorCodes.UNAUTHORIZED);
      }
    }

    const systems = await this.prisma.system.findMany({
      where: { userId },
      select: { id: true, customName: true },
    });

    if (systems.length === 0) {
      return [];
    }

    const sessions = await this.prisma.frontSession.findMany({
      where: {
        systemId: { in: systems.map((system) => system.id) },
        endTime: null,
      },
      orderBy: {
        startTime: 'desc',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            systemId: true,
          },
        },
      },
    });

    const systemById = new Map(systems.map((system) => [system.id, system]));

    return sessions.map((session) => ({
      sessionId: session.id,
      startTime: session.startTime,
      member: session.member,
      system: {
        id: session.systemId,
        customName: systemById.get(session.systemId)?.customName ?? null,
      },
    }));
  }

  async updateCurrentUser(userId: string, dto: UpdateMeDto) {
    const hasUpdate = dto.username !== undefined || dto.email !== undefined;
    if (!hasUpdate) {
      return this.getCurrentUser(userId);
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(errorCodes.USER_NOT_FOUND);
    }

    if (dto.username !== undefined || dto.email !== undefined) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          id: { not: userId },
          OR: [
            ...(dto.username !== undefined
              ? [
                  {
                    username: {
                      equals: dto.username,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...(dto.email !== undefined ? [{ email: dto.email }] : []),
          ],
        },
        select: { id: true },
      });

      if (conflict) {
        throw new ConflictException(errorCodes.USER_ALREADY_EXISTS);
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username !== undefined ? { username: dto.username } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
      select: userPrivateSelect,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException(errorCodes.USER_NOT_FOUND);
    }

    const isValid = await argon2id.verify(user.password, dto.currentPassword);
    if (!isValid) {
      throw new UnauthorizedException(errorCodes.INVALID_CREDENTIALS);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await argon2id.hash(dto.newPassword),
      },
      select: { id: true },
    });

    return { success: true };
  }
}
