import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSystemDto } from './dto/createSystem.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { CustomField, System, User } from '@prisma/client';
import { SystemService } from './system.service';
import { SystemInterceptor } from './system.interceptor';
import { System as Sys } from 'src/decorators/system.decorator';
import { UpdateCustomFieldDefinitionDto } from './dto/updateCustomFieldDefinition.dto';

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

    @Put('customFields')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async createCustomField(@Sys() system: System) : Promise<CustomField> {
        return this.systemService.createCustomFieldForSystem(system);
    }

    @Patch('customFields/:fieldId')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateCustomField(@Sys() system: System, @Param('fieldId') fieldId: string, @Body() dto: UpdateCustomFieldDefinitionDto) : Promise<CustomField> {
        return this.systemService.updateCustomField(system, fieldId, dto);
    }

    @Delete('customFields/:fieldId')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async deleteCustomField(@Sys() system: System, @Param('fieldId') fieldId: string) : Promise<void> {
        await this.systemService.deleteCustomField(system, fieldId);
        return;
    }
}
