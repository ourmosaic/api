import {
  Body,
  HttpCode,
  HttpStatus,
  Controller,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
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
  importFromSimplyPlural(@Body() data: any, @CurrentUser() user: User) {
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
  importFromAmpersand(@Body() data: any, @CurrentUser() user: User) {
    return this.importService.importFromAmpersand(user, data);
  }
}
