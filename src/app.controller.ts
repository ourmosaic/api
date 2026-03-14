import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { AppService } from './app.service';
import i18n from './utils/i18n';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version(VERSION_NEUTRAL)
  getHello(): { message: string; version: string } {
    return this.appService.getHello();
  }

  @Get('lang')
  @Version(VERSION_NEUTRAL)
  getLanguage() {
    return i18n;
  }
}
