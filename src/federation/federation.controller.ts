import { Body, Controller, Get, Header, Headers, Post, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { FederationService } from './federation.service';
import type { AnyFederationMessage } from './federationDef';

@Controller('federation')
export class FederationController {
    constructor(private readonly federationService: FederationService) {}

    @Version(VERSION_NEUTRAL)
    @Get('info')
    getInfo() {
        return this.federationService.getInfo();
    }

    @Version(VERSION_NEUTRAL)
    @Post('receive')
    async receiveMessage(@Body() message: AnyFederationMessage, @Headers('X-Federation-Uri') senderFederation: string) {
        return this.federationService.receiveMessage(message, senderFederation);
    }
}
