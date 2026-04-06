import {
  Body,
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
  async importFromSimplyPlural(@Body() data: any, @CurrentUser() user: User) {
    return this.importService.importFromSimplyPlural(user, data);
  }
}
