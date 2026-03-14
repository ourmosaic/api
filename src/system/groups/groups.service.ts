import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MembersService } from '../members/members.service';
import { SystemService } from '../system.service';
import type { Group, System } from '@prisma/client';
import { CreateGroupDto } from './dto/createGroup.dto';

@Injectable()
export class GroupsService {
    constructor(
        private prisma: PrismaService,
        private membersService: MembersService,
        private systemService: SystemService
    ) {}

    async createGroup(system: System, dto: CreateGroupDto): Promise<Group> {
        return this.prisma.group.create({
            data: {
                name: dto.name || `${system.customName} Group`,
                color: dto.color || '#000000',
                icon: dto.icon || 'default-group-icon',
                systemId: system.id,
                parentId: dto.parentId || null
            }
        });
    }
}
