import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
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
import errorCodes from 'src/utils/errorCodes';
import { CreateSystemOrSubSystemDto } from './dto/createSystemOrSubSystem.dto';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('@me')
  @Version('1')
  @UseGuards(AuthGuard)
  async createSystem(
    @Body() createSystemDto: CreateSystemDto,
    @CurrentUser() user: User,
  ): Promise<System> {
    return this.systemService.createSystem(createSystemDto, user);
  }

  @Post('@me')
  @Version('2')
  @UseGuards(AuthGuard)
  async createSystemOrSubSystem(
    @Body() createSystemDto: CreateSystemOrSubSystemDto,
    @CurrentUser() user: User,
  ): Promise<System> {
    return this.systemService.createSystemOrSubSystem(createSystemDto, user);
  }

  @Get('@me')
  @Version('1')
  @UseGuards(AuthGuard)
  async getMySystem(@CurrentUser() user: User): Promise<System> {
    return this.systemService.getSystemByUser(user);
  }

  @Get('@me')
  @Version('2')
  @UseGuards(AuthGuard)
  async getSystemsByUser(@CurrentUser() user: User): Promise<System[]> {
    return this.systemService.getSystemsByUser(user);
  }

  @Get(':id')
  @Version('2')
  @UseGuards(AuthGuard)
  async getSystemById(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
  ): Promise<System> {
    return this.systemService.getSystemByIdAndUser(systemId, user);
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  async deleteMySystem(
    @CurrentUser() user: User,
    @Param('id') systemId: string,
  ): Promise<void> {
    if (systemId == '@me')
      return await this.systemService.deleteSystemForUser(user);
    return await this.systemService.deleteSystemByIdAndUser(systemId, user);
  }

  @Put(':id/customFields')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async createCustomField(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
  ): Promise<CustomField> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.systemService.createCustomFieldForSystem(system);
  }

  @Patch(':id/customFields/:fieldId')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async updateCustomField(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
  ): Promise<CustomField> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.systemService.updateCustomField(system, fieldId, dto);
  }

  @Delete(':id/customFields/:fieldId')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async deleteCustomField(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Param('fieldId') fieldId: string,
  ): Promise<void> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    await this.systemService.deleteCustomField(system, fieldId);
    return;
  }

  @Get(':id/customFields')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async listCustomFields(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
  ): Promise<CustomField[]> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.systemService.listCustomFields(system);
  }

  @Patch(':id/avatar')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor, FileInterceptor('file'))
  async updateAvatar(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException(errorCodes.AVATAR_FILE_REQUIRED),
      }),
    )
    file: Express.Multer.File,
  ): Promise<System> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.systemService.updateSystemAvatar(system, file);
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(SystemInterceptor)
  async updateSystemInfo(
    @Param('id') systemId: string,
    @CurrentUser() user: User,
    @Body() dto: Partial<UpdateSystemDto>,
  ): Promise<System> {
    const system = await this.systemService.getSystemByIdAndUser(
      systemId,
      user,
    );
    return this.systemService.updateSystemInfo(system, dto);
  }
}
