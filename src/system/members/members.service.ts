import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemService } from '../system.service';
import type { User, Member, System } from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';
import errorCodes from 'src/utils/errorCodes';

@Injectable()
export class MembersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly systemService: SystemService
    ) {}

    async createMember(system: System, dto: CreateMemberDto) : Promise<Member> {
        return await this.prisma.member.create({
            data: {
                name: dto.name,
                description: dto.description,
                pronouns: dto.pronouns,
                role: dto.role,
                systemId: system.id,
                privacy: dto.privacy
            }
        });
    }

    async updateMember(memberId: string, system: System, dto: UpdateMemberDto) : Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: {
                id: memberId
            }
        });

        if (!member || member.systemId !== system.id) {
            throw new Error(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
        }

        return await this.prisma.member.update({
            where: {
                id: memberId
            },
            data: {
                name: dto.name,
                description: dto.description,
                pronouns: dto.pronouns,
                role: dto.role,
                privacy: dto.privacy
            }
        });
    }

    async getMembersFor(system: System) : Promise<Member[]> {
        return await this.prisma.member.findMany({
            where: {
                systemId: system.id
            }
        });
    }

    async getMemberById(id: string, system: System) : Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: {
                id,
                systemId: system.id
            }
        });

        if (!member) {
            throw new Error(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
        }

        return member;
    }
}