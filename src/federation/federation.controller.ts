import { Controller, Get, Post, Version, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { FederationService } from './federation.service';

@Controller('federation')
export class FederationController {
    constructor(private readonly federationService: FederationService) {}

    @Get('info')
    getInfo() {
        return this.federationService.getInfo();
    }

    @Version(VERSION_NEUTRAL)
    @Post('receive')
    async receiveMessage() {
        return { message: 'Message received' };
    }
}
