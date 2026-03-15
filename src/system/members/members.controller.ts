import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { System as Sys } from 'src/decorators/system.decorator';
import type { FrontSession, Member, System } from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';
import { UpdateFieldContentDto } from './dto/updateFieldContent.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import errorCodes from 'src/utils/errorCodes';
import { StorageService } from 'src/storage/storage.service';
import sharp from 'sharp';
import { UploadedFile } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Member as MemberEntity } from 'src/@generated/prisma-nestjs-dto/member.entity';

@Controller('system/members')
export class MembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly storageService: StorageService
    ) {} 

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

    @Get(':id/front-sessions')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async getFrontSessionsForMember(@Sys() system: System, @Param('id') memberId: string, @Query('limit') limit: number = 10, @Query('offset') offset: number = 0): Promise<FrontSession[]> {
        return this.membersService.getFrontSessionsForMember(memberId, system, limit, offset);
    }

    @Get('front-sessions')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async getFrontSessionsForSystem(
        @Sys() system: System,
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0,
        @Query('startDate') startDate: number = Date.now() - 30 * 24 * 60 * 60 * 1000,
        @Query('endDate') endDate: number = Date.now()
    ): Promise<FrontSession[]> {
        return this.membersService.getFrontSessionsForSystem(system, limit, offset, startDate, endDate);
    }

    @Put(':id/groups')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateMemberGroups(@Sys() system: System, @Param('id') memberId: string, @Body('groupIds') groupIds: string[]): Promise<Member> {
        return this.membersService.updateMemberGroups(memberId, system, groupIds);
    }

    @Delete(':id/groups')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async deleteMemberGroups(@Sys() system: System, @Param('id') memberId: string, @Body('groupIds') groupIds: string[]): Promise<Member> {
        return this.membersService.deleteMemberGroups(memberId, system, groupIds);
    }

    @Post(':id/avatar')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOkResponse({ description: 'Avatar uploaded successfully', type: MemberEntity })
    async uploadMemberAvatar(@Sys() system: System, @Param('id') memberId: string, @UploadedFile() file: Express.Multer.File): Promise<Member> {
        try {
            const metadata = await sharp(file.buffer).metadata();
            if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
                throw new BadRequestException(errorCodes.GIFS_NOT_SUPPORTED);
            }
            const procImage = await sharp(file.buffer)
                .resize({ width: 512, height: 512, fit: sharp.fit.cover })
                .webp({ quality: 80 })
                .toBuffer();

            const fileName = `avatars/${memberId}-${Date.now()}.webp`;

            await this.storageService.uploadFile('mosaic', fileName, procImage);

            return this.membersService.updateAvatarUrl(memberId, system, `https://storage.ourmosaic.space/mosaic/${fileName}`);
        } catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            console.error('Error uploading avatar:', err);
            throw new BadRequestException(errorCodes.GIFS_NOT_SUPPORTED);
        }
    }
}