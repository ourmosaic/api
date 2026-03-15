import { Body, Controller, Post, Req, UseGuards, Version } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
    constructor(
        private importService: ImportService
    ) {}

    @Post('simplyplural')
    @UseGuards(AuthGuard)
    @Version('1')
    async importFromSimplyPlural(@Body() data: any, @Req() req: any) {
        return this.importService.importFromSimplyPlural(req.user, data);
    }
}
