import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { AnyFederationMessage } from './federationDef';
import { ConfigService } from '@nestjs/config';

@Processor('federation_outgoing')
export class FederationProcessor extends WorkerHost {
  private readonly logger = new Logger(FederationProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async process(job: Job<AnyFederationMessage>): Promise<any> {
    const message = job.data;
    this.logger.debug(
      `Processing outgoing federation message of type ${message.type} to ${message.targetFederation}`,
    );
    try {
      this.logger.log(
        `Attempt ${job.attemptsMade + 1}: Sending message to ${message.targetFederation}/federation/receive`,
      );
      const response = await axios.post(
        `https://${message.targetFederation}/federation/receive`,
        message,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Federation-Uri':
              this.configService.get<string>('INSTANCE_ADDR')!,
          },
          timeout: 10000,
        },
      );
      console.log(
        `Received response from ${message.targetFederation}:`,
        response.data,
      );
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send message to ${message.targetFederation}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
