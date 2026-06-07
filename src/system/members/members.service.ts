import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemService } from '../system.service';
import {
  FriendshipStatus,
  FriendshipType,
  type FrontSession,
  type Member,
  type MemberOnGroups,
  type System,
} from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';
import errorCodes from 'src/utils/errorCodes';
import { FieldType } from '../dto/updateCustomFieldDefinition.dto';
import { UpdateFieldContentDto } from './dto/updateFieldContent.dto';
import { RedisService } from 'src/redis/redis.service';
import { REDIS_EVENTS } from 'src/utils/constants';
import { FederationService } from 'src/federation/federation.service';
import { FederationMessageType } from 'src/federation/federationDef';
import { v5 as uuidv5 } from 'uuid';

export type MemberWithGroups = Member & {
  groups: MemberOnGroups[];
};

type FrontUpdateEventName = 'FRONT_SESSION_STARTED' | 'FRONT_SESSION_ENDED';
type FederationFrontUpdateBroadcastPayload = {
  type: FederationMessageType.FRONT_UPDATE;
  timestamp: number;
  systemId: string;
  memberId: string;
  frontId: string;
  event: FrontUpdateEventName;
};
type FriendFrontUpdatePayload = {
  event: FrontUpdateEventName;
  timestamp: number;
  systemId: string;
  memberId: string;
  frontId: string;
};
type FederationBroadcaster = {
  broadcastMessageToFederations: (
    message: FederationFrontUpdateBroadcastPayload,
    targetFederations: string[],
  ) => Promise<void>;
};

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemService: SystemService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => FederationService))
    private readonly federationService: FederationService,
  ) {}

  private async notifyFederatedFrontUpdate(
    system: System,
    memberId: string,
    frontId: string,
    event: FrontUpdateEventName,
  ): Promise<void> {
    const authorizedFriendships = await this.prisma.friendship.findMany({
      where: {
        userOneId: system.userId,
        status: FriendshipStatus.ACCEPTED,
        type: FriendshipType.SUPERFRIENDS,
        userTwo: {
          isFederated: true,
          domain: { not: null },
        },
      },
      include: {
        userTwo: {
          select: {
            domain: true,
          },
        },
      },
    });

    const targetFederations = Array.from(
      new Set(
        authorizedFriendships
          .filter((f) => f.canReceiveFrontNotifications)
          .map((friendship) => friendship.userTwo.domain)
          .filter((domain): domain is string =>
            Boolean(
              domain && typeof domain === 'string' && domain.trim().length > 0,
            ),
          ),
      ),
    );
    if (targetFederations.length === 0) {
      return;
    }

    const message: FederationFrontUpdateBroadcastPayload = {
      type: FederationMessageType.FRONT_UPDATE,
      timestamp: Date.now(),
      systemId: system.id,
      memberId,
      frontId,
      event,
    };

    const federationBroadcaster = this
      .federationService as unknown as FederationBroadcaster;
    await federationBroadcaster.broadcastMessageToFederations(
      message,
      targetFederations,
    );
  }

  private async notifyFriendFrontUpdate(
    system: System,
    memberId: string,
    frontId: string,
    event: FrontUpdateEventName,
  ): Promise<void> {
    // Find all friends who should receive notifications about this system's front changes
    // Two cases:
    // 1. Friends where THIS system is userOne and has enabled notifications (userTwo can receive)
    // 2. Friends where THIS system is userTwo and the friend has enabled notifications
    const [outgoingFriendships, incomingFriendships] = await Promise.all([
      // Case 1: Friends where we're userOne and we've given them permission to receive our notifications
      this.prisma.friendship.findMany({
        where: {
          userOneId: system.userId,
          status: FriendshipStatus.ACCEPTED,
          canReceiveFrontNotifications: true,
        },
        select: {
          userTwoId: true,
        },
      }),
      this.prisma.friendship.findMany({
        where: {
          userTwoId: system.userId,
          status: FriendshipStatus.ACCEPTED,
          notifyMeOnFriendFrontChange: true,
        },
        select: {
          userOneId: true,
        },
      }),
    ]);

    const outgoingRecipients = new Set<string>(
      outgoingFriendships.map((f) => f.userTwoId),
    );
    const incomingRecipients = new Set<string>(
      incomingFriendships.map((f) => f.userOneId),
    );

    const recipientIds = new Set<string>([
      ...outgoingRecipients,
      ...incomingRecipients,
    ]);

    if (recipientIds.size === 0) {
      return;
    }

    const [activeSessions, friendUser] = await Promise.all([
      this.prisma.frontSession.findMany({
        where: { systemId: system.id, endTime: null },
        include: { member: { select: { id: true, name: true } } },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: system.userId },
        select: { username: true },
      }),
    ]);

    const activeMemberList = activeSessions.map((s) => ({
      memberId: s.member.id,
      name: s.member.name,
    }));

    const friendDisplay = {
      userId: system.userId,
      username: friendUser?.username,
      systemId: system.id,
      customName: system.customName,
    };

    const friendFrontSessionsPayload = {
      event,
      timestamp: Date.now(),
      friend: friendDisplay,
      activeMembers: activeMemberList,
    };

    const simplePayload: FriendFrontUpdatePayload = {
      event,
      timestamp: Date.now(),
      systemId: system.id,
      memberId,
      frontId,
    };

    await Promise.all(
      [...recipientIds].map((userId) =>
        Promise.all([
          this.redisService.publish(
            `user:${userId}:friendFrontSessions`,
            JSON.stringify(friendFrontSessionsPayload),
          ),
          this.redisService.publish(
            `user:${userId}:frontChanges`,
            JSON.stringify({ event, data: simplePayload }),
          ),
        ]),
      ),
    );
  }

  async getMembersByGroupId(
    system: System,
    groupId: string,
  ): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: {
        systemId: system.id,
        groups: {
          some: {
            groupId,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteMember(memberId: string, system: System): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    await this.prisma.member.delete({
      where: {
        id: memberId,
      },
    });
  }

  async createMember(system: System, dto: CreateMemberDto): Promise<Member> {
    return this.prisma.member.create({
      data: {
        name: dto.name,
        description: dto.description,
        pronouns: dto.pronouns,
        role: dto.role,
        systemId: system.id,
        privacy: dto.privacy,
        inDormancy: dto.inDormancy,
      },
    });
  }

  async updateAvatarUrl(
    memberId: string,
    system: System,
    avatarUrl: string,
  ): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    return this.prisma.member.update({
      where: {
        id: memberId,
      },
      data: {
        avatarUrl,
      },
    });
  }

  async updateMember(
    memberId: string,
    system: System,
    dto: UpdateMemberDto,
  ): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    return this.prisma.member.update({
      where: {
        id: memberId,
      },
      data: {
        name: dto.name,
        description: dto.description,
        pronouns: dto.pronouns,
        role: dto.role,
        privacy: dto.privacy,
        color: dto.color,
        inDormancy: dto.inDormancy,
      },
    });
  }

  async syncFrontSessions(
    sessions: {
      memberId: string;
      sessionId?: string;
      startTime: number;
      endTime?: number;
    }[],
    system: System,
  ): Promise<FrontSession[]> {
    const createdSessions: FrontSession[] = [];

    for (const session of sessions) {
      const member = await this.prisma.member.findUnique({
        where: {
          id: session.memberId,
        },
      });

      if (!member || member.systemId !== system.id) {
        continue;
      }

      let namespacedSessionId: string | null = null;

      if (session.sessionId) {
        namespacedSessionId = uuidv5(session.sessionId, system.id);
      }

      if (!namespacedSessionId) {
        const oldestActiveSession = await this.prisma.frontSession.findFirst({
          where: {
            memberId: session.memberId,
            systemId: system.id,
            endTime: null,
          },
          orderBy: {
            startTime: 'asc',
          },
        });

        if (oldestActiveSession) {
          namespacedSessionId = oldestActiveSession.id;
        } else {
          namespacedSessionId = uuidv5(
            `${session.memberId}:${session.startTime}`,
            system.id,
          );
        }
      }

      const finalSession = await this.prisma.frontSession.findUnique({
        where: {
          id: namespacedSessionId,
        },
      });

      if (finalSession) {
        if (
          session.endTime &&
          (!finalSession.endTime ||
            finalSession.endTime.getTime() !== session.endTime)
        ) {
          await this.prisma.frontSession.update({
            where: {
              id: namespacedSessionId,
            },
            data: {
              endTime: new Date(session.endTime),
            },
          });
        }
        continue;
      }

      const createdSession = await this.prisma.frontSession.create({
        data: {
          id: namespacedSessionId,
          memberId: session.memberId,
          systemId: system.id,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : null,
        },
      });

      createdSessions.push(createdSession);
    }

    return createdSessions;
  }

  async getMembersFor(
    system: System,
    includeCustomFields: boolean = false,
  ): Promise<MemberWithGroups[]> {
    return (await this.prisma.member.findMany({
      where: {
        systemId: system.id,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: {
        groups: {
          select: {
            groupId: true,
          },
        },
        ...(includeCustomFields && {
          customFieldValues: {
            select: {
              value: true,
              customFieldId: true,
              customField: {
                select: {
                  name: true,
                  type: true,
                  privacy: true,
                },
              },
            },
          },
        }),
      },
    })) as unknown as MemberWithGroups[];
  }

  async getMemberById(
    id: string,
    system: System,
    includeCustomFields: boolean = false,
  ): Promise<MemberWithGroups> {
    const member = (await this.prisma.member.findUnique({
      where: {
        id,
        systemId: system.id,
      },
      include: {
        groups: {
          select: {
            groupId: true,
          },
        },
        ...(includeCustomFields && {
          customFieldValues: {
            select: {
              value: true,
              customFieldId: true,
              customField: {
                select: {
                  name: true,
                  type: true,
                  privacy: true,
                },
              },
            },
          },
        }),
      },
    })) as unknown as MemberWithGroups | null;

    if (!member) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    return member;
  }

  private isValidDayMonth(value: string): boolean {
    const match = /^(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return false;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12 || day < 1) {
      return false;
    }

    const maxDaysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= maxDaysByMonth[month - 1];
  }

  private isValidMonthYear(value: string): boolean {
    const match = /^(\d{2})-(\d{4})$/.exec(value);
    if (!match) {
      return false;
    }

    const month = Number(match[1]);
    return month >= 1 && month <= 12;
  }

  private isValidDateTime(value: string): boolean {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
        value,
      );

    if (!match) {
      return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = match[6] ? Number(match[6]) : 0;

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      second < 0 ||
      second > 59
    ) {
      return false;
    }

    const maxDaysInMonth = new Date(year, month, 0).getDate();
    return day <= maxDaysInMonth;
  }

  castStringToType(value: string, type: FieldType): string | number | Date {
    switch (type) {
      case FieldType.STRING:
        return value;
      case FieldType.NUMBER: {
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return numberValue;
      }
      case FieldType.LONG_TEXT:
        return value;
      case FieldType.COLOR:
        // Basic validation for hex color code
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return value;
      case FieldType.DATE: {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return dateValue;
      }
      case FieldType.DATE_DAY_MONTH:
        if (!this.isValidDayMonth(value)) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return value;
      case FieldType.DATETIME:
        if (!this.isValidDateTime(value)) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return value;
      case FieldType.DATE_MONTH_YEAR:
        if (!this.isValidMonthYear(value)) {
          throw new BadRequestException(
            errorCodes.INVALID_FIELD_VALUE_FOR_TYPE,
          );
        }
        return value;
      default:
        throw new BadRequestException(errorCodes.UNKNOWN_FIELD_TYPE);
    }
  }

  async updateMemberField(
    memberId: string,
    system: System,
    fieldId: string,
    dto: UpdateFieldContentDto,
  ): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    const customField = await this.systemService.getCustomFieldById(
      fieldId,
      system,
    );
    if (!customField) {
      throw new NotFoundException(errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM);
    }

    const castedValue = this.castStringToType(
      dto.value,
      customField.type as FieldType,
    );

    const existingFieldValue = await this.prisma.customFieldValue.findFirst({
      where: {
        AND: [{ memberId }, { customFieldId: fieldId }],
      },
    });
    if (existingFieldValue) {
      await this.prisma.customFieldValue.update({
        where: {
          id: existingFieldValue.id,
        },
        data: {
          value: String(castedValue),
        },
      });
    } else {
      await this.prisma.customFieldValue.create({
        data: {
          memberId,
          customFieldId: fieldId,
          value: String(castedValue),
        },
      });
    }

    return await this.getMemberById(memberId, system, true);
  }

  async startFrontSessionForMember(
    memberId: string,
    system: System,
  ): Promise<FrontSession> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    // member must NOT already have an active session
    const activeSession = await this.prisma.frontSession.findFirst({
      where: {
        memberId,
        systemId: system.id,
        endTime: null,
      },
    });

    if (activeSession) {
      throw new BadRequestException(
        errorCodes.MEMBER_ALREADY_HAS_ACTIVE_SESSION,
      );
    }

    const frontSession = await this.prisma.frontSession.create({
      data: {
        memberId,
        systemId: system.id,
      },
    });

    await this.redisService.publish(
      `${system.id}::sessions`,
      JSON.stringify({
        event: REDIS_EVENTS.FRONT_SESSION_STARTED,
        data: {
          sessionId: frontSession.id,
          memberId,
        },
      }),
    );

    await this.notifyFederatedFrontUpdate(
      system,
      memberId,
      frontSession.id,
      'FRONT_SESSION_STARTED',
    );

    await this.notifyFriendFrontUpdate(
      system,
      memberId,
      frontSession.id,
      'FRONT_SESSION_STARTED',
    );

    return frontSession;
  }

  async endFrontSessionWithId(
    sessionId: string,
    system: System,
  ): Promise<FrontSession> {
    const session = await this.prisma.frontSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session || session.systemId !== system.id) {
      throw new NotFoundException(errorCodes.FRONT_SESSION_NOT_FOUND_IN_SYSTEM);
    }

    if (session.endTime) {
      throw new BadRequestException(
        errorCodes.FRONT_SESSION_NOT_FOUND_IN_SYSTEM,
      );
    }

    await this.prisma.frontSession.update({
      where: {
        id: sessionId,
      },
      data: {
        endTime: new Date(),
      },
    });

    const sessionMocked = {
      ...session,
      endTime: new Date(),
    };

    await this.redisService.publish(
      `${system.id}::sessions`,
      JSON.stringify({
        event: REDIS_EVENTS.FRONT_SESSION_ENDED,
        data: {
          sessionId,
          memberId: session.memberId,
        },
      }),
    );

    await this.notifyFederatedFrontUpdate(
      system,
      session.memberId,
      sessionId,
      'FRONT_SESSION_ENDED',
    );

    await this.notifyFriendFrontUpdate(
      system,
      session.memberId,
      sessionId,
      'FRONT_SESSION_ENDED',
    );

    return sessionMocked;
  }

  async endFrontSessionForMember(
    memberId: string,
    system: System,
  ): Promise<FrontSession> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    const activeSession = await this.prisma.frontSession.findFirst({
      where: {
        memberId,
        systemId: system.id,
        endTime: null,
      },
    });

    if (!activeSession) {
      throw new NotFoundException(errorCodes.FRONT_SESSION_NOT_FOUND_IN_SYSTEM);
    }

    return await this.endFrontSessionWithId(activeSession.id, system);
  }

  async getFrontSessionsForMember(
    memberId: string,
    system: System,
    limit: number,
    offset: number,
  ): Promise<FrontSession[]> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }

    return await this.prisma.frontSession.findMany({
      where: {
        memberId,
        systemId: system.id,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async getFrontSessionsForSystem(
    system: System,
    limit: number,
    offset: number,
    startDate: number,
    endDate: number,
  ): Promise<FrontSession[]> {
    return await this.prisma.frontSession.findMany({
      where: {
        systemId: system.id,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async removeGroupFromMembers(system: System, groupId: string): Promise<true> {
    await this.prisma.memberOnGroups.deleteMany({
      where: {
        groupId,
      },
    });
    return true;
  }

  async updateMemberGroups(
    memberId: string,
    system: System,
    groupIds: string[],
  ): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });
    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }
    const validGroups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds },
        systemId: system.id,
      },
    });
    const validGroupIds = validGroups.map((g) => g.id);
    const existingMemberGroups = await this.prisma.memberOnGroups.findMany({
      where: {
        memberId,
      },
    });
    const existingGroupIds = existingMemberGroups.map((mg) => mg.groupId);

    const newGroupIds = validGroupIds.filter(
      (id) => !existingGroupIds.includes(id),
    );
    const memberOnGroupsToCreate = newGroupIds.map((groupId) => ({
      memberId,
      groupId,
    }));

    if (memberOnGroupsToCreate.length > 0) {
      await this.prisma.memberOnGroups.createMany({
        data: memberOnGroupsToCreate,
        skipDuplicates: true,
      });
    }

    return await this.getMemberById(memberId, system, true);
  }

  async deleteMemberGroups(
    memberId: string,
    system: System,
    groupIds: string[],
  ): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });
    if (!member || member.systemId !== system.id) {
      throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
    }
    await this.prisma.memberOnGroups.deleteMany({
      where: {
        memberId,
        groupId: { in: groupIds },
      },
    });
    return await this.getMemberById(memberId, system, true);
  }

  async getActiveFrontSessionsForSystem(
    system: System,
    withMemberDetails: boolean = false,
  ): Promise<FrontSession[]> {
    return this.prisma.frontSession.findMany({
      where: {
        systemId: system.id,
        endTime: null,
      },
      ...(withMemberDetails && {
        include: {
          member: true,
        },
      }),
      orderBy: {
        startTime: 'desc',
      },
    });
  }
}
