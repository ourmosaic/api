import { Body, Controller, Post, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ReportDto } from './dto/report.dto';
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
}
