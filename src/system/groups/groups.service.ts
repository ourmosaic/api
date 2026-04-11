import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MembersService } from '../members/members.service';
import { SystemService } from '../system.service';
import type { Group, System } from '@prisma/client';
import { CreateGroupDto } from './dto/createGroup.dto';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MembersService))
    private membersService: MembersService,
    private systemService: SystemService,
  ) {}

  async createGroup(system: System, dto: CreateGroupDto): Promise<Group> {
    return this.prisma.group.create({
      data: {
        name: dto.name || `${system.customName} Group`,
        color: dto.color || '#000000',
        icon: dto.icon || 'default-group-icon',
        systemId: system.id,
        parentId: dto.parentId || null,
      },
    });
  }

  async deleteChildGroups(parentId: string): Promise<true> {
    const childGroups = await this.prisma.group.findMany({
      where: { parentId },
    });

    for (const group of childGroups) {
      await this.deleteGroup({ id: group.systemId } as System, group.id);
    }

    return true;
  }

  async deleteGroup(system: System, groupId: string): Promise<true> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group || group.systemId !== system.id) {
      throw new Error('Group not found in system');
    }

    await this.membersService.removeGroupFromMembers(system, groupId);
    await this.deleteChildGroups(groupId);
    await this.prisma.group.delete({
      where: { id: groupId },
    });
    return true;
  }
}
