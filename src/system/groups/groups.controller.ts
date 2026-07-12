import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SystemInterceptor } from '../system.interceptor';
import { GroupsService } from './groups.service';
import type { User } from '@prisma/client';
import { CreateGroupDto } from './dto/createGroup.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { SystemService } from '../system.service';

@Controller('system/:sysId/groups')
export class GroupsController {
  constructor(
    private groupsService: GroupsService,
    private systemService: SystemService,
  ) {}

  @Get()
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getGroups(@Param('sysId') sysId: string, @CurrentUser() user: User) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.getGroupsForSystem(system);
  }

  @Get(':id/children')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getChildGroups(
    @Param('id') groupId: string,
    @Param('sysId') sysId: string,
    @CurrentUser() user: User,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.getChildGroupsForGroup(system, groupId);
  }

  @Get(':id/members')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async getMembersInGroup(
    @Param('id') groupId: string,
    @Param('sysId') sysId: string,
    @CurrentUser() user: User,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.getMembersInGroup(system, groupId);
  }

  @Post()
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async createGroup(
    @Body() dto: CreateGroupDto,
    @Param('sysId') sysId: string,
    @CurrentUser() user: User,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.createGroup(system, dto);
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async deleteGroup(
    @Param('id') groupId: string,
    @Param('sysId') sysId: string,
    @CurrentUser() user: User,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.deleteGroup(system, groupId);
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async updateGroup(
    @Param('id') groupId: string,
    @Body() dto: Partial<CreateGroupDto>,
    @Param('sysId') sysId: string,
    @CurrentUser() user: User,
  ) {
    const system = await this.systemService.getSystemByIdAndUser(sysId, user);
    return this.groupsService.updateGroup(system, groupId, dto);
  }
}
