import {
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Controller,
  Post,
  UseGuards,
  Version,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ImportService } from './import.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../@generated/prisma-nestjs-dto/user.entity';

@Controller('import')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('simplyplural')
  @UseGuards(AuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  importFromSimplyPlural(
    @Body() data: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    if (file?.buffer?.length) {
      try {
        const parsedFile: unknown = JSON.parse(file.buffer.toString('utf8'));
        return this.importService.importFromSimplyPlural(user, parsedFile);
      } catch {
        throw new BadRequestException('INVALID_JSON_FILE');
      }
    }

    return this.importService.importFromSimplyPlural(user, data);
  }

  @Post('simplyplural/api')
  @UseGuards(AuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.ACCEPTED)
  importFromSimplyPluralApi(
    @Body() data: { apiKey: string },
    @CurrentUser() user: User,
  ) {
    return this.importService.importFromSimplyPluralApi(user, data);
  }

  @Post('ampersand')
  @UseGuards(AuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  importFromAmpersand(
    @Body() data: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    if (file?.buffer?.length) {
      try {
        const parsedFile: unknown = JSON.parse(file.buffer.toString('utf8'));
        return this.importService.importFromAmpersand(user, parsedFile);
      } catch {
        throw new BadRequestException('INVALID_JSON_FILE');
      }
    }

    return this.importService.importFromAmpersand(user, data);
  }
}
