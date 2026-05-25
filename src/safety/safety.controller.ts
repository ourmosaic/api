import { Body, Controller, Post, Get, Delete, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ReportDto } from './dto/report.dto';
import { BlockDto, UnblockDto } from './dto/block.dto';
import type { User } from '@prisma/client';

@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Version(VERSION_NEUTRAL)
  @Post('report')
  @UseGuards(AuthGuard)
  async report(@CurrentUser() user: User, @Body() reportDto: ReportDto) {
    return this.safetyService.report(user, reportDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('block')
  @UseGuards(AuthGuard)
  async block(@CurrentUser() user: User, @Body() blockDto: BlockDto) {
    return this.safetyService.block(user, blockDto);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('unblock')
  @UseGuards(AuthGuard)
  async unblock(@CurrentUser() user: User, @Body() unblockDto: UnblockDto) {
    return this.safetyService.unblock(user, unblockDto);
  }

  @Version(VERSION_NEUTRAL)
  @Get('blocked/users')
  @UseGuards(AuthGuard)
  async getBlockedUsers(@CurrentUser('id') userId: string) {
    return this.safetyService.getBlockedUsers(userId);
  }

  @Version(VERSION_NEUTRAL)
  @Get('blocked/members')
  @UseGuards(AuthGuard)
  async getBlockedMembers(@CurrentUser('id') userId: string) {
    return this.safetyService.getBlockedMembers(userId);
  }

  @Version(VERSION_NEUTRAL)
  @Get('blocked/systems')
  @UseGuards(AuthGuard)
  async getBlockedSystems(@CurrentUser('id') userId: string) {
    return this.safetyService.getBlockedSystems(userId);
  }
}
