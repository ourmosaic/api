import { Controller, Get } from '@nestjs/common';
import { FederationService } from './federation.service';

@Controller('federation')
export class FederationController {
    constructor(private readonly federationService: FederationService) {}

    @Get('info')
    getInfo() {
        return this.federationService.getInfo();
    }
}
