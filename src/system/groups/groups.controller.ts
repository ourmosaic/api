import { Body, Controller, Delete, Post, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { GroupsService } from './groups.service';
import { System as Sys } from 'src/decorators/system.decorator';
import type { System } from '@prisma/client';
import { CreateGroupDto } from './dto/createGroup.dto';

@Controller('system/@me/groups')
export class GroupsController {
    constructor(
        private groupsService: GroupsService
    ) {}

    @Post()
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async createGroup(@Sys() system: System, @Body() dto: CreateGroupDto) {
        return this.groupsService.createGroup(system, dto);
    }

    @Delete(':id')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async deleteGroup(@Sys() system: System, @Body('id') groupId: string) {
        return this.groupsService.deleteGroup(system, groupId);
    }
}
