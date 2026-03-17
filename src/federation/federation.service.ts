import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FriendshipService } from 'src/friendship/friendship.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupsService } from 'src/system/groups/groups.service';
import { MembersService } from 'src/system/members/members.service';
import { SystemService } from 'src/system/system.service';
import { UsersService } from 'src/users/users.service';
import type { AnyFederationMessage } from './federationDef';
import { SubscriberService } from 'src/redis/subscriber/subscriber.service';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FederationService {
    private publicKey: string;
    private privateKey: string;
    private logger = new Logger(FederationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly membersService: MembersService,
        private readonly usersService: UsersService,
        private readonly systemsService: SystemService,
        @Inject(forwardRef(() => FriendshipService))
        private readonly friendshipService: FriendshipService,
        private readonly groupsService: GroupsService,
        private readonly redis: SubscriberService,
        private readonly configService: ConfigService,
        @InjectQueue('federation_outgoing') private readonly federationOutgoingQueue
    ) {
        try {
            this.publicKey = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public.key'), 'utf-8');
            this.privateKey = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'private.key'), 'utf-8');
            if (!this.publicKey || !this.privateKey) {
                throw new Error('Public and private keys must be set for federation service');
            }
        } catch (error) {
            this.logger.error('Error loading keys for FederationService:', error);
            throw new Error('Failed to initialize FederationService due to key loading error');
        }
        if (!this.configService.get<string>('INSTANCE_ADDR')) {
            this.logger.error('INSTANCE_ADDR environment variable is not set. This is required for federation to function properly.');
            throw new Error('INSTANCE_ADDR environment variable is required for FederationService');
        }
    }

    getInfo() {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8'));
        const publicKey = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public.key'), 'utf-8');
        return {
            version: packageJson.version,
            publicKey: publicKey
        };
    }

    signMessage(message: AnyFederationMessage): string {
        const messageString = JSON.stringify(message);
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(messageString);
        signer.end();
        return signer.sign(this.privateKey, 'base64');
    }

    verifyMessageIntegrity(message: AnyFederationMessage, signature: string, senderPublicKey: string): boolean {
        const messageString = JSON.stringify(message);
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(messageString);
        verifier.end();
        return verifier.verify(senderPublicKey, signature, 'base64');
    }

    async enqueueMessage(
        message: AnyFederationMessage
    ) {
        const signature = this.signMessage(message);
        message.signature = signature;
        await this.federationOutgoingQueue.add('sendMessage', message, {
            attempts: 12,
            backoff: {
                type: 'exponential',
                delay: 1 * 60 * 1000,
            },
            removeOnComplete: true,
            removeOnFail: false
        });
        this.logger.log(`Enqueued message for ${message.targetFederation} : ${JSON.stringify(message)}`);
    }

    sendMessage(targetFederation: string, message: AnyFederationMessage) {
        if (!message.signature) return this.logger.error('Cannot send message without signature. Ensure the message is signed using signMessage() before sending.');
        this.logger.log(`Sending message to ${targetFederation} : ${JSON.stringify(message)}`);
    }
}
