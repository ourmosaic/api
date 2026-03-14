import { Body, Controller, Delete, Get, Post, UseGuards, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSystemDto } from './dto/createSystem.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { System, User } from '@prisma/client';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
    constructor(private readonly systemService: SystemService) {}

    @Post('@me')
    @Version('1')
    @UseGuards(AuthGuard)
    async createSystem(@Body() createSystemDto: CreateSystemDto, @CurrentUser() user: User): Promise<System> {
        return this.systemService.createSystem(createSystemDto, user);
    }

    @Get('@me')
    @Version('1')
    @UseGuards(AuthGuard)
    async getMySystem(@CurrentUser() user: User): Promise<System> {
        return this.systemService.getSystemByUser(user);
    }

    @Delete('@me')
    @Version('1')
    @UseGuards(AuthGuard)
    async deleteMySystem(@CurrentUser() user: User): Promise<void> {
        await this.systemService.deleteSystemForUser(user);
        return;
    }
}
