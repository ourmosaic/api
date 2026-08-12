import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ReportType, BlockType, User } from '@prisma/client';
import { ReportDto } from './dto/report.dto';
import { BlockDto, UnblockDto } from './dto/block.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FederationService } from '../federation/federation.service';
import {
  FederationMessageType,
  FriendRejectMessage,
} from '../federation/federationDef';
import DataExportTemplate from '../templates/dataExport.template';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FederationService))
    private readonly federationService: FederationService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

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

        // Bloquer le système
        const blockedSystem = await this.prisma.blockedSystem.create({
          data: {
            blockerId: user.id,
            blockedId: blockDto.targetId,
            reason: blockDto.reason,
          },
        });

        // Bloquer aussi l'utilisateur propriétaire du système
        const systemOwner = system.userId;
        const existingUserBlock = await this.prisma.blockedUser.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: systemOwner,
            },
          },
        });

        if (!existingUserBlock) {
          await this.prisma.blockedUser.create({
            data: {
              blockerId: user.id,
              blockedId: systemOwner,
              reason: blockDto.reason
                ? `Auto-blocked with system: ${blockDto.reason}`
                : 'Auto-blocked with system',
            },
          });
        }

        // Retirer l'amitié si elle existe (dans les deux directions)
        const friendships = await this.prisma.friendship.findMany({
          where: {
            OR: [
              {
                userOneId: user.id,
                userTwoId: systemOwner,
              },
              {
                userOneId: systemOwner,
                userTwoId: user.id,
              },
            ],
          },
          include: {
            userOne: true,
            userTwo: true,
          },
        });

        for (const friendship of friendships) {
          await this.prisma.friendship.delete({
            where: { id: friendship.id },
          });

          // Notifier la fédération si l'ami est fédéré
          const otherUser =
            friendship.userOneId === user.id
              ? friendship.userTwo
              : friendship.userOne;
          if (otherUser.isFederated && otherUser.domain) {
            const message: FriendRejectMessage = {
              type: FederationMessageType.FRIEND_REJECT,
              timestamp: Date.now(),
              targetFederation: otherUser.domain,
              distantId: otherUser.distantId || '',
              senderUsername: user.username,
              recipientUsername: otherUser.username,
            };
            await this.federationService.enqueueMessage(message);
          }
        }

        return blockedSystem;
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

        // Récupérer le système pour trouver son propriétaire
        const system = await this.prisma.system.findUnique({
          where: {
            id: unblockDto.targetId,
          },
        });

        const systemOwner = system?.userId;

        // Supprimer le blocage du système
        await this.prisma.blockedSystem.delete({
          where: {
            id: blocked.id,
          },
        });

        // Débloquer aussi l'utilisateur propriétaire du système (si le blocage auto a été créé)
        if (systemOwner) {
          const userBlock = await this.prisma.blockedUser.findUnique({
            where: {
              blockerId_blockedId: {
                blockerId: user.id,
                blockedId: systemOwner,
              },
            },
          });

          // Vérifier si le blocage a été créé automatiquement (contient "Auto-blocked with system")
          if (
            userBlock &&
            userBlock.reason?.includes('Auto-blocked with system')
          ) {
            await this.prisma.blockedUser.delete({
              where: {
                id: userBlock.id,
              },
            });
          }
        }

        return blocked;
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

  async exportData(userId: string) {
    const redisKey = `data_export:${userId}`;
    const existingExport = await this.redisService.get(redisKey);

    if (existingExport) {
      throw new BadRequestException(
        'You can only request a data export once every 24 hours. Please try again later.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        isFederated: true,
        domain: true,
        distantId: true,
        isSystem: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const systems = await this.prisma.system.findMany({
      where: { userId },
      include: {
        members: {
          include: {
            customFieldValues: {
              include: {
                customField: true,
              },
            },
            frontSessions: true,
            groups: {
              include: {
                group: true,
              },
            },
            chatMessages: true,
            boardMessagesSent: true,
            boardMessagesReceived: true,
          },
        },
        groups: {
          include: {
            members: true,
          },
        },
        customFields: {
          include: {
            values: true,
          },
        },
        channels: {
          include: {
            category: true,
            chatMessages: true,
          },
        },
        channelCategories: true,
        frontSessions: true,
        childSystems: true,
      },
    });

    const sentFriendRequests = await this.prisma.friendship.findMany({
      where: { userOneId: userId },
      include: {
        userTwo: {
          select: {
            id: true,
            username: true,
            email: true,
            isFederated: true,
            domain: true,
          },
        },
      },
    });

    const receivedFriendRequests = await this.prisma.friendship.findMany({
      where: { userTwoId: userId },
      include: {
        userOne: {
          select: {
            id: true,
            username: true,
            email: true,
            isFederated: true,
            domain: true,
          },
        },
      },
    });

    const reports = await this.prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        ReportUser: true,
        ReportMember: true,
        ReportSystem: true,
      },
    });

    const blockedUsers = await this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const blockedMembers = await this.prisma.blockedMember.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            pronouns: true,
          },
        },
      },
    });

    const blockedSystems = await this.prisma.blockedSystem.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            customName: true,
            userId: true,
          },
        },
      },
    });

    const exportData = {
      user,
      systems,
      friendships: {
        sent: sentFriendRequests,
        received: receivedFriendRequests,
      },
      reports,
      blocks: {
        users: blockedUsers,
        members: blockedMembers,
        systems: blockedSystems,
      },
      exportDate: new Date().toISOString(),
    };

    const jsonData = JSON.stringify(exportData, null, 2);

    const dte = new DataExportTemplate();
    await this.mailService.sendMail(
      `"${user.username.replace(/"/g, "'")}" <${user.email}>`,
      dte.getTitle(),
      dte.render({
        user_name: user.username,
        instance_name: this.configService.get<string>('INSTANCE_NAME')!,
      }),
      [
        {
          filename: `mosaic_export_${user.username}_${new Date().toISOString().split('T')[0]}.json`,
          content: jsonData,
          contentType: 'application/json',
        },
      ],
    );

    await this.redisService.setex(redisKey, 86400, 'true');

    return { success: true };
  }
}
