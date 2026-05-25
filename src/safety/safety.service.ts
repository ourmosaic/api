import { Injectable, BadRequestException } from '@nestjs/common';
import { ReportType, BlockType, User } from '@prisma/client';
import { ReportDto } from './dto/report.dto';
import { BlockDto, UnblockDto } from './dto/block.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async report(user: User, reportDto: ReportDto) {
    switch (reportDto.type) {
      case ReportType.USER: {
        const user = await this.prisma.user.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!user) {
          throw new Error('User not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.USER,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportUser.create({
          data: {
            reportId: defaultReport.id,
            userId: reportDto.targetId,
          },
        });
      }

      case ReportType.MEMBER: {
        const member = await this.prisma.member.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!member) {
          throw new Error('Member not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.MEMBER,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportMember.create({
          data: {
            reportId: defaultReport.id,
            memberId: reportDto.targetId,
          },
        });
      }

      case ReportType.SYSTEM: {
        const system = await this.prisma.system.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!system) {
          throw new Error('System not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.SYSTEM,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportSystem.create({
          data: {
            reportId: defaultReport.id,
            systemId: reportDto.targetId,
          },
        });
      }

      default:
        throw new Error('Invalid report type');
    }
  }

  async block(user: User, blockDto: BlockDto) {
    // Vérifier qu'on ne se bloque pas soi-même
    if (blockDto.targetId === user.id) {
      throw new BadRequestException('Cannot block yourself');
    }

    switch (blockDto.type) {
      case BlockType.USER: {
        const targetUser = await this.prisma.user.findUnique({
          where: {
            id: blockDto.targetId,
          },
        });
        if (!targetUser) {
          throw new Error('User not found');
        }

        // Vérifier si déjà bloqué
        const existing = await this.prisma.blockedUser.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: blockDto.targetId,
            },
          },
        });

        if (existing) {
          throw new BadRequestException('User already blocked');
        }

        return this.prisma.blockedUser.create({
          data: {
            blockerId: user.id,
            blockedId: blockDto.targetId,
            reason: blockDto.reason,
          },
        });
      }

      case BlockType.MEMBER: {
        const member = await this.prisma.member.findUnique({
          where: {
            id: blockDto.targetId,
          },
        });
        if (!member) {
          throw new Error('Member not found');
        }

        // Vérifier si déjà bloqué
        const existing = await this.prisma.blockedMember.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: blockDto.targetId,
            },
          },
        });

        if (existing) {
          throw new BadRequestException('Member already blocked');
        }

        return this.prisma.blockedMember.create({
          data: {
            blockerId: user.id,
            blockedId: blockDto.targetId,
            reason: blockDto.reason,
          },
        });
      }

      case BlockType.SYSTEM: {
        const system = await this.prisma.system.findUnique({
          where: {
            id: blockDto.targetId,
          },
        });
        if (!system) {
          throw new Error('System not found');
        }

        // Vérifier si déjà bloqué
        const existing = await this.prisma.blockedSystem.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: blockDto.targetId,
            },
          },
        });

        if (existing) {
          throw new BadRequestException('System already blocked');
        }

        return this.prisma.blockedSystem.create({
          data: {
            blockerId: user.id,
            blockedId: blockDto.targetId,
            reason: blockDto.reason,
          },
        });
      }

      default:
        throw new Error('Invalid block type');
    }
  }

  async unblock(user: User, unblockDto: UnblockDto) {
    switch (unblockDto.type) {
      case BlockType.USER: {
        const blocked = await this.prisma.blockedUser.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: unblockDto.targetId,
            },
          },
        });

        if (!blocked) {
          throw new BadRequestException('User not blocked');
        }

        return this.prisma.blockedUser.delete({
          where: {
            id: blocked.id,
          },
        });
      }

      case BlockType.MEMBER: {
        const blocked = await this.prisma.blockedMember.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: unblockDto.targetId,
            },
          },
        });

        if (!blocked) {
          throw new BadRequestException('Member not blocked');
        }

        return this.prisma.blockedMember.delete({
          where: {
            id: blocked.id,
          },
        });
      }

      case BlockType.SYSTEM: {
        const blocked = await this.prisma.blockedSystem.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: unblockDto.targetId,
            },
          },
        });

        if (!blocked) {
          throw new BadRequestException('System not blocked');
        }

        return this.prisma.blockedSystem.delete({
          where: {
            id: blocked.id,
          },
        });
      }

      default:
        throw new Error('Invalid block type');
    }
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.blockedUser.findMany({
      where: {
        blockerId: userId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async getBlockedMembers(userId: string) {
    return this.prisma.blockedMember.findMany({
      where: {
        blockerId: userId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getBlockedSystems(userId: string) {
    return this.prisma.blockedSystem.findMany({
      where: {
        blockerId: userId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            customName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
