import { Body, Controller, Post, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { GroupsService } from './groups.service';
import { System as Sys } from 'src/decorators/system.decorator';
import type { System } from '@prisma/client';
import { CreateGroupDto } from './dto/createGroup.dto';

@Controller('system/groups')
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
}
