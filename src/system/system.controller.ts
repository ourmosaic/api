import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSystemDto } from './dto/createSystem.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { CustomField, System, User } from '@prisma/client';
import { SystemService } from './system.service';
import { SystemInterceptor } from './system.interceptor';
import { System as Sys } from 'src/decorators/system.decorator';
import { UpdateCustomFieldDefinitionDto } from './dto/updateCustomFieldDefinition.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateSystemDto } from 'src/@generated/prisma-nestjs-dto/update-system.dto';

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

    @Put('@me/customFields')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async createCustomField(@Sys() system: System) : Promise<CustomField> {
        return this.systemService.createCustomFieldForSystem(system);
    }

    @Patch('@me/customFields/:fieldId')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateCustomField(@Sys() system: System, @Param('fieldId') fieldId: string, @Body() dto: UpdateCustomFieldDefinitionDto) : Promise<CustomField> {
        return this.systemService.updateCustomField(system, fieldId, dto);
    }

    @Delete('@me/customFields/:fieldId')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async deleteCustomField(@Sys() system: System, @Param('fieldId') fieldId: string) : Promise<void> {
        await this.systemService.deleteCustomField(system, fieldId);
        return;
    }

    @Patch('@me/avatar')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor, FileInterceptor('file'))
    async updateAvatar(@Sys() system: System, @UploadedFile() file: Express.Multer.File): Promise<System> {
        return this.systemService.updateSystemAvatar(system, file);
    }

    @Patch('@me')
    @Version('1')
    @UseGuards(AuthGuard)
    @UseInterceptors(SystemInterceptor)
    async updateSystemInfo(@Sys() system: System, @Body() dto: Partial<UpdateSystemDto>): Promise<System> {
        return this.systemService.updateSystemInfo(system, dto);
    }
}
