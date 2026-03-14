import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { System as Sys } from 'src/decorators/system.decorator';
import type { Member, System } from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';

@Controller('system/members')
export class MembersController {
    constructor(private readonly membersService: MembersService) {} 

    @Get()
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async getMembers(@Sys() system: System): Promise<Member[]> {
        return this.membersService.getMembersFor(system);
    }

    @Post()
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async createMember(@Sys() system: System, @Body() dto: CreateMemberDto): Promise<Member> {
        return this.membersService.createMember(system, dto);
    }

    @Patch(':id')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateMember(@Sys() system: System, @Body() dto: UpdateMemberDto, @Param('id') memberId: string): Promise<Member> {
        return this.membersService.updateMember(memberId, system, dto);
    }

    @Get(':id')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async getMemberById(@Sys() system: System, @Param('id') memberId: string): Promise<Member> {
        return this.membersService.getMemberById(memberId, system);
    }
}
