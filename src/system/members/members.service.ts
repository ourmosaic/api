import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemService } from '../system.service';
import {
  FriendshipStatus,
  FriendshipType,
  type Member,
  type System,
  type FrontSession,
  type MemberOnGroups,
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
      select: {
        userTwo: {
          select: { domain: true },
        },
      },
    });

    const targetFederations = Array.from(
      new Set(
        authorizedFriendships
          .map((friendship) => friendship.userTwo.domain)
          .filter((domain): domain is string =>
            Boolean(domain && domain.trim().length > 0),
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

  async createMember(system: System, dto: CreateMemberDto): Promise<Member> {
    return this.prisma.member.create({
      data: {
        name: dto.name,
        description: dto.description,
        pronouns: dto.pronouns,
        role: dto.role,
        systemId: system.id,
        privacy: dto.privacy,
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

    return await this.prisma.member.update({
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

    return await this.prisma.member.update({
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
      },
    });
  }

  async syncFrontSessions(
    sessions: {
      memberId: string;
      sessionId: string;
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

      const namespacedSessionId = uuidv5(session.sessionId, system.id);

      const existingSession = await this.prisma.frontSession.findUnique({
        where: {
          id: namespacedSessionId,
        },
      });

      if (existingSession) {
        if (
          session.endTime &&
          (!existingSession.endTime ||
            existingSession.endTime.getTime() !== session.endTime)
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

  private castStringToType(
    value: string,
    type: FieldType,
  ): string | number | Date {
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
