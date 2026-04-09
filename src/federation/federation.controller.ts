import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
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
  @Get('handshake')
  async handshake(
    @Headers('X-Federation-Uri') senderFederation: string,
    @Headers('X-Federation-Signature') signature: string,
    @Headers('X-Request-Id') requestId: string,
    @Headers('X-Request-Timestamp') timestamp: string,
  ) {
    await this.federationService.getFederationPublicKey(senderFederation);
    return this.federationService.handleHandshake(
      senderFederation,
      signature,
      requestId,
      timestamp,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('receive')
  async receiveMessage(
    @Body() message: AnyFederationMessage,
    @Headers('X-Federation-Uri') senderFederation: string,
    @Headers('X-Federation-Signature') signature: string,
  ) {
    return this.federationService.receiveMessage(
      message,
      senderFederation,
      signature,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('outbox')
  getOutbox(
    @Headers('X-Federation-Uri') senderFederation: string,
    @Headers('X-Federation-Signature') signature: string,
    @Headers('X-Request-Id') requestId: string,
    @Headers('X-Request-Timestamp') timestamp: string,
  ) {
    return this.federationService.getOutbox(
      senderFederation,
      signature,
      requestId,
      timestamp,
    );
  }
}
