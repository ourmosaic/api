import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { System as Sys } from 'src/decorators/system.decorator';
import type { FrontSession, Member, System } from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';
import { UpdateFieldContentDto } from './dto/updateFieldContent.dto';

@Controller('system/members')
export class MembersController {
    constructor(private readonly membersService: MembersService) {} 

    @Get()
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async getMembers(@Sys() system: System, @Query('withCustomFields') withCustomFields: boolean = false): Promise<Member[]> {
        return this.membersService.getMembersFor(system, withCustomFields);
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
    async getMemberById(@Sys() system: System, @Param('id') memberId: string, @Query('withCustomFields') withCustomFields: boolean = false): Promise<Member> {
        return this.membersService.getMemberById(memberId, system, withCustomFields);
    }

    @Patch(':id/fields/:fieldId')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateMemberField(@Sys() system: System, @Param('id') memberId: string, @Param('fieldId') fieldId: string, @Body() dto: UpdateFieldContentDto): Promise<Member> {
        return this.membersService.updateMemberField(memberId, system, fieldId, dto);
    }

    @Post(':id/front-session/start')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async startFrontSession(@Sys() system: System, @Param('id') memberId: string): Promise<FrontSession> {
        return this.membersService.startFrontSessionForMember(memberId, system);
    }

    @Post('front-session/:sessionId/end')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async endFrontSession(@Sys() system: System, @Param('sessionId') sessionId: string): Promise<FrontSession> {
        return this.membersService.endFrontSessionWithId(sessionId, system);
    }

    @Post(':id/front-session/end')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async endFrontSessionForMember(@Sys() system: System, @Param('id') memberId: string): Promise<FrontSession> {
        return this.membersService.endFrontSessionForMember(memberId, system);
    }
}
