import { Injectable, Inject, forwardRef, Logger, BadRequestException } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FriendshipService } from 'src/friendship/friendship.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupsService } from 'src/system/groups/groups.service';
import { MembersService } from 'src/system/members/members.service';
import { SystemService } from 'src/system/system.service';
import { UsersService } from 'src/users/users.service';
import { FederationMessageType, FriendRequestMessage, type AnyFederationMessage } from './federationDef';
import { SubscriberService } from 'src/redis/subscriber/subscriber.service';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
        // we need to remove message.signature before verifying, otherwise the signature will always be invalid
        const { signature: _, ...messageWithoutSignature } = message;
        const messageString = JSON.stringify(messageWithoutSignature);
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

    async receiveMessage(message: AnyFederationMessage, senderFederationWithProto: string) {
        this.logger.debug(`Received message of type ${message.type} from ${senderFederationWithProto} at ${message.timestamp}`);
        // REMOVE protocol : we're using HTTP anyway
        const senderFederation = senderFederationWithProto.replace(/^https?:\/\//, '');
        const senderInfo = await this.prisma.knownFederation.findUnique({ where: { url: senderFederation } });
        if (!senderInfo) {
            this.logger.warn(`Received message from unknown federation ${senderFederation}. Looking up public key...`);
            try {
                const response = await axios.get(`http://${senderFederation}/federation/info`, { timeout: 5000 });
                const senderPublicKey = response.data.publicKey;
                if (!senderPublicKey) {
                    this.logger.error(`Federation ${senderFederation} did not provide a public key in its info response.`);
                    throw new BadRequestException('Invalid federation info response: missing public key');
                }

                // CHECK IF THIS IS A VALID RSA PUBLIC KEY
                try {
                    crypto.createPublicKey(senderPublicKey);
                } catch (error) {
                    this.logger.error(`Invalid public key format received from federation ${senderFederation}: ${error.message}`);
                    throw new BadRequestException('Invalid public key format received from federation');
                }

                await this.prisma.knownFederation.create({
                    data: {
                        url: senderFederation,
                        publicKey: senderPublicKey
                    }
                });

                this.logger.log(`Added ${senderFederation} to known federations with retrieved public key.`);
            } catch (error) {
                this.logger.error(`Failed to retrieve info from federation ${senderFederation}: ${error.message}`);
                throw new BadRequestException('Unable to verify message from unknown federation and failed to retrieve its public key');
            }
        }
        const senderPublicKey = senderInfo ? senderInfo.publicKey : (await this.prisma.knownFederation.findUnique({ where: { url: senderFederation } }))?.publicKey;
        if (!senderPublicKey) {
            this.logger.error(`Public key for federation ${senderFederation} is not available. Cannot verify message.`);
            throw new BadRequestException('Public key for sender federation is not available');
        }
        if (!this.verifyMessageIntegrity(message, message.signature!, senderPublicKey)) {
            this.logger.warn(`Message signature verification failed for message from ${senderFederation}. Possible tampering detected.`);
            throw new BadRequestException('Message integrity verification failed');
        }
        this.logger.debug(`Message signature verified successfully for message from ${senderFederation}. In a real implementation, we would now process the message based on its type and content.`);
        switch (message.type) {
            case FederationMessageType.FRIEND_REQUEST:
                // change message to FriendRequestMessage type
                const friendRequestMessage = message as FriendRequestMessage;
                this.logger.debug(`Processing friend request from ${friendRequestMessage.senderUsername} to ${friendRequestMessage.recipientUsername} via federation ${senderFederation}`);
                // we need to find the user with the username and create a friend request
                const recipientUser = await this.prisma.user.findFirst({ where: { username: friendRequestMessage.recipientUsername } });
                if (!recipientUser) {
                    this.logger.warn(`Recipient user ${friendRequestMessage.recipientUsername} not found for friend request from ${friendRequestMessage.senderUsername} via federation ${senderFederation}`);
                    throw new BadRequestException('Recipient user not found for friend request');
                }
                let senderUser = await this.prisma.user.findFirst({ where: { username: friendRequestMessage.senderUsername } });
                if (!senderUser) {
                    this.logger.warn(`Sender user ${friendRequestMessage.senderUsername} not found in local database for friend request via federation ${senderFederation}. Creating a new user.`);
                    const user = await this.prisma.user.create({
                        data: {
                            username: friendRequestMessage.senderUsername,
                            password: crypto.randomBytes(16).toString('hex'),
                            isFederated: true,
                            domain: senderFederation,
                            email: `${friendRequestMessage.senderUsername}@${senderFederation}`
                        }
                    });
                    this.logger.log(`Created new federated user ${user.username} for sender ${friendRequestMessage.senderUsername} from federation ${senderFederation}`);
                    senderUser = user;
                }
                const existingFriendship = await this.prisma.friendship.findFirst({
                    where: {
                        OR: [
                            { userOneId: senderUser.id, userTwoId: recipientUser.id },
                            { userOneId: recipientUser.id, userTwoId: senderUser.id }
                        ]
                    }
                });
                if (existingFriendship) {
                    this.logger.warn(`Friendship already exists between ${senderUser.username} and ${recipientUser.username}. Ignoring duplicate friend request from federation ${senderFederation}.`);
                    throw new BadRequestException('Friendship already exists or is pending');
                }
                await this.friendshipService.sendFriendRequest(senderUser, {
                    recipientId: recipientUser.id
                });
                this.logger.log(`Created friend request from ${senderUser.username} to ${recipientUser.username} based on message from federation ${senderFederation}`);
                return { message: 'Friend request processed successfully' };
            default:
                this.logger.warn(`Received unsupported message type ${message.type} from federation ${senderFederation}. No processing implemented for this message type.`);
                throw new BadRequestException('Unsupported message type');
        }
    }
}
