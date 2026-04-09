import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FriendshipService } from 'src/friendship/friendship.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupsService } from 'src/system/groups/groups.service';
import { MembersService } from 'src/system/members/members.service';
import { SystemService } from 'src/system/system.service';
import { UsersService } from 'src/users/users.service';
import {
  FederationMessageType,
  FriendRequestMessage,
  type AnyFederationMessage,
  MessagesBefore,
} from './federationDef';
import { SubscriberService } from 'src/redis/subscriber/subscriber.service';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Queue } from 'bullmq';
import stringify from 'fast-json-stable-stringify';

const OUTBOX_REQUEST_TTL_SECONDS = 300;
const OUTBOX_MAX_MESSAGES = 100;

@Injectable()
export class FederationService {
  private publicKey: string;
  private privateKey: string;
  private logger = new Logger(FederationService.name);

  private static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

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
    @InjectQueue('federation_outgoing')
    private readonly federationOutgoingQueue: Queue<AnyFederationMessage>,
  ) {
    try {
      this.publicKey = fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'public.key'),
        'utf-8',
      );
      this.privateKey = fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'private.key'),
        'utf-8',
      );
      if (!this.publicKey || !this.privateKey) {
        throw new Error(
          'Public and private keys must be set for federation service',
        );
      }
    } catch (error) {
      this.logger.error('Error loading keys for FederationService:', error);
      throw new Error(
        'Failed to initialize FederationService due to key loading error',
      );
    }
    if (!this.configService.get<string>('INSTANCE_ADDR')) {
      this.logger.error(
        'INSTANCE_ADDR environment variable is not set. This is required for federation to function properly.',
      );
      throw new Error(
        'INSTANCE_ADDR environment variable is required for FederationService',
      );
    }
  }

  getInfo() {
    const packageJsonRaw: unknown = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'package.json'),
        'utf-8',
      ),
    );
    if (
      !packageJsonRaw ||
      typeof packageJsonRaw !== 'object' ||
      !('version' in packageJsonRaw) ||
      typeof packageJsonRaw.version !== 'string'
    ) {
      throw new Error('Invalid package.json: missing string version field');
    }
    const publicKey = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'public.key'),
      'utf-8',
    );
    return {
      version: packageJsonRaw.version,
      publicKey: publicKey,
    };
  }

  signMessage(message: AnyFederationMessage): string {
    const messageString = stringify(message);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(messageString);
    signer.end();
    return signer.sign(this.privateKey, 'base64');
  }

  verifyMessageIntegrity(
    message: AnyFederationMessage,
    signature: string,
    senderPublicKey: string,
  ): boolean {
    const messageString = stringify(message);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(messageString);
    verifier.end();
    return verifier.verify(senderPublicKey, signature, 'base64');
  }

  async enqueueMessage(message: AnyFederationMessage) {
    message.nonce = crypto.randomBytes(32).toString('hex');
    message.signature = this.signMessage(message);
    await this.federationOutgoingQueue.add('sendMessage', message, {
      attempts: 12,
      backoff: {
        type: 'exponential',
        delay: 60 * 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(
      `Enqueued message for ${message.targetFederation} : ${stringify(message)}`,
    );
  }

  async receiveMessage(
    message: AnyFederationMessage,
    senderFederationWithProto: string,
    signature: string,
  ) {
    if (!message || !senderFederationWithProto || !signature) {
      this.logger.warn(
        `Received invalid message. Missing required fields. Message: ${stringify(
          message,
        )}, Sender Federation: ${senderFederationWithProto}, Signature: ${
          signature || 'None'
        }`,
      );
      throw new BadRequestException(
        'Missing required fields in federation message',
      );
    }
    this.logger.debug(
      `Received message of type ${message.type} from ${senderFederationWithProto} at ${message.timestamp}`,
    );
    if (Date.now() - message.timestamp > 5 * 60 * 1000) {
      this.logger.warn(
        `Received message with timestamp ${message.timestamp} which is older than 5 minutes. Rejecting message.`,
      );
      throw new BadRequestException('Message timestamp is too old');
    }
    if (!message.nonce) {
      this.logger.warn(
        `Received message without nonce from ${senderFederationWithProto}. Rejecting message to prevent replay attacks.`,
      );
      throw new BadRequestException('Missing nonce in federation message');
    }
    const isNewNonce = await this.redis.set(
      'federation:nonce:' + message.nonce,
      '1',
      'EX',
      300,
      'NX',
    );
    if (!isNewNonce) {
      this.logger.warn(
        `Received message with nonce ${message.nonce} which has already been seen. Possible replay attack. Rejecting message.`,
      );
      throw new BadRequestException('Replay attack: nonce already used');
    }
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    const senderInfo = await this.prisma.knownFederation.findUnique({
      where: { url: senderFederation },
    });
    if (!senderInfo) {
      this.logger.warn(
        `Received message from unknown federation ${senderFederation}. Looking up public key...`,
      );
      try {
        const response = await axios.get<{ publicKey?: string }>(
          `https://${senderFederation}/federation/info`,
          { timeout: 5000 },
        );
        const senderPublicKey = response.data.publicKey;
        if (!senderPublicKey) {
          this.logger.error(
            `Federation ${senderFederation} did not provide a public key in its info response.`,
          );
          throw new BadRequestException(
            'Invalid federation info response: missing public key',
          );
        }

        try {
          crypto.createPublicKey(senderPublicKey);
        } catch (error: unknown) {
          this.logger.error(
            `Invalid public key format received from federation ${senderFederation}: ${FederationService.getErrorMessage(error)}`,
          );
          throw new BadRequestException(
            'Invalid public key format received from federation',
          );
        }

        await this.prisma.knownFederation.create({
          data: {
            url: senderFederation,
            publicKey: senderPublicKey,
          },
        });

        this.logger.log(
          `Added ${senderFederation} to known federations with retrieved public key.`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Failed to retrieve info from federation ${senderFederation}: ${FederationService.getErrorMessage(error)}`,
        );
        throw new BadRequestException(
          'Unable to verify message from unknown federation and failed to retrieve its public key',
        );
      }
    }
    const senderPublicKey = senderInfo
      ? senderInfo.publicKey
      : (
          await this.prisma.knownFederation.findUnique({
            where: { url: senderFederation },
          })
        )?.publicKey;
    if (!senderPublicKey) {
      this.logger.error(
        `Public key for federation ${senderFederation} is not available. Cannot verify message.`,
      );
      throw new BadRequestException(
        'Public key for sender federation is not available',
      );
    }
    if (!this.verifyMessageIntegrity(message, signature, senderPublicKey)) {
      this.logger.warn(
        `Message signature verification failed for message from ${senderFederation}. Possible tampering detected.`,
      );
      throw new BadRequestException('Message integrity verification failed');
    }
    this.logger.debug(
      `Message signature verified successfully for message from ${senderFederation}. In a real implementation, we would now process the message based on its type and content.`,
    );
    switch (message.type) {
      case FederationMessageType.FRIEND_REQUEST: {
        const friendRequestMessage: FriendRequestMessage = message;
        this.logger.debug(
          `Processing friend request from ${friendRequestMessage.senderUsername} to ${friendRequestMessage.recipientUsername} via federation ${senderFederation}`,
        );
        // we need to find the user with the username and create a friend request
        const recipientUser = await this.prisma.user.findFirst({
          where: { username: friendRequestMessage.recipientUsername },
        });
        if (!recipientUser) {
          this.logger.warn(
            `Recipient user ${friendRequestMessage.recipientUsername} not found for friend request from ${friendRequestMessage.senderUsername} via federation ${senderFederation}`,
          );
          throw new BadRequestException(
            'Recipient user not found for friend request',
          );
        }
        let senderUser = await this.prisma.user.findFirst({
          where: { username: friendRequestMessage.senderUsername },
        });
        if (!senderUser) {
          this.logger.warn(
            `Sender user ${friendRequestMessage.senderUsername} not found in local database for friend request via federation ${senderFederation}. Creating a new user.`,
          );
          const user = await this.prisma.user.create({
            data: {
              username: friendRequestMessage.senderUsername,
              password: crypto.randomBytes(16).toString('hex'),
              isFederated: true,
              domain: senderFederation,
              email: `${friendRequestMessage.senderUsername}@${senderFederation}`,
            },
          });
          this.logger.log(
            `Created new federated user ${user.username} for sender ${friendRequestMessage.senderUsername} from federation ${senderFederation}`,
          );
          senderUser = user;
        }
        const existingFriendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { userOneId: senderUser.id, userTwoId: recipientUser.id },
              { userOneId: recipientUser.id, userTwoId: senderUser.id },
            ],
          },
        });
        if (existingFriendship) {
          this.logger.warn(
            `Friendship already exists between ${senderUser.username} and ${recipientUser.username}. Ignoring duplicate friend request from federation ${senderFederation}.`,
          );
          throw new BadRequestException(
            'Friendship already exists or is pending',
          );
        }
        await this.friendshipService.sendFriendRequest(senderUser, {
          recipientId: recipientUser.id,
        });
        this.logger.log(
          `Created friend request from ${senderUser.username} to ${recipientUser.username} based on message from federation ${senderFederation}`,
        );
        return { message: 'Friend request processed successfully' };
      }
      default:
        this.logger.warn(
          `Received unsupported message type ${message.type} from federation ${senderFederation}. No processing implemented for this message type.`,
        );
        throw new BadRequestException('Unsupported message type');
    }
  }

  async getFederationPublicKey(
    senderFederationWithProto: string,
  ): Promise<string> {
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    const senderInfo = await this.prisma.knownFederation.findUnique({
      where: { url: senderFederation },
    });
    if (!senderInfo) {
      this.logger.warn(
        `Requested public key for unknown federation ${senderFederation}. Cannot provide public key.`,
      );
      // fetch
      try {
        const response = await axios.get<{ publicKey?: string }>(
          `https://${senderFederation}/federation/info`,
          { timeout: 5000 },
        );
        const senderPublicKey = response.data.publicKey;
        if (!senderPublicKey) {
          this.logger.error(
            `Federation ${senderFederation} did not provide a public key in its info response.`,
          );
          throw new BadRequestException(
            'Invalid federation info response: missing public key',
          );
        }

        try {
          crypto.createPublicKey(senderPublicKey);
        } catch (error: unknown) {
          this.logger.error(
            `Invalid public key format received from federation ${senderFederation}: ${FederationService.getErrorMessage(error)}`,
          );
          throw new BadRequestException(
            'Invalid public key format received from federation',
          );
        }

        await this.prisma.knownFederation.create({
          data: {
            url: senderFederation,
            publicKey: senderPublicKey,
          },
        });

        this.logger.log(
          `Added ${senderFederation} to known federations with retrieved public key.`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Failed to retrieve info from federation ${senderFederation}: ${FederationService.getErrorMessage(error)}`,
        );
        throw new BadRequestException(
          'Unable to retrieve public key for unknown federation',
        );
      }
    }

    return senderInfo!.publicKey;
  }

  async verifyMessage(
    messageBefore: MessagesBefore,
    senderFederationWithProto: string,
    signature: string,
    requestId: string,
    timestamp: string,
  ) {
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    this.logger.debug(
      `Verifying message of type ${messageBefore} from ${senderFederation} with request ID ${requestId} at timestamp ${timestamp}`,
    );
    const message = `$$${messageBefore}$$${senderFederation}.${requestId}@${timestamp}`;
    const senderInfo = await this.prisma.knownFederation.findUnique({
      where: { url: senderFederation },
    });
    if (!senderInfo) {
      this.logger.warn(
        `Received message from unknown federation ${senderFederation}. Cannot verify signature.`,
      );
      throw new BadRequestException(
        'Unknown federation, please handshake first',
      );
    }
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(message);
    verifier.end();
    const isValid = verifier.verify(senderInfo.publicKey, signature, 'base64');
    if (!isValid) {
      this.logger.warn(
        `Message signature verification failed for message of type ${messageBefore} from ${senderFederation}. Possible tampering detected.`,
      );
      throw new BadRequestException('Invalid signature for message');
    }
    this.logger.debug(
      `Message signature verified successfully for message of type ${messageBefore} from ${senderFederation}.`,
    );
    return true;
  }

  async verifyOutboxRequest(
    senderFederationWithProto: string,
    signature: string,
    requestId: string,
    timestamp: string,
  ): Promise<boolean> {
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    this.logger.debug(
      `Verifying outbox request from ${senderFederation} with request ID ${requestId} at timestamp ${timestamp}`,
    );
    const message = this.getGetOutboxMessage(
      senderFederation,
      requestId,
      timestamp,
    );
    const senderInfo = await this.prisma.knownFederation.findUnique({
      where: { url: senderFederation },
    });
    if (!senderInfo) {
      this.logger.warn(
        `Received outbox request from unknown federation ${senderFederation}. Cannot verify signature.`,
      );
      throw new BadRequestException(
        'Unknown federation, please handshake first',
      );
    }
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(message);
    verifier.end();
    const isValid = verifier.verify(senderInfo.publicKey, signature, 'base64');
    if (!isValid) {
      this.logger.warn(
        `Outbox request signature verification failed for request from ${senderFederation}. Possible tampering detected.`,
      );
      throw new BadRequestException('Invalid signature for outbox request');
    }
    this.logger.debug(
      `Outbox request signature verified successfully for request from ${senderFederation}.`,
    );
    return true;
  }

  async getOutbox(
    senderFederationWithProto: string,
    signature: string,
    requestId: string,
    timestamp: string,
  ) {
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    this.logger.debug(
      `Received request for outbox from ${senderFederation} with request ID ${requestId} at timestamp ${timestamp}`,
    );
    const isValid = await this.verifyOutboxRequest(
      senderFederationWithProto,
      signature,
      requestId,
      timestamp,
    );
    if (!isValid) {
      this.logger.warn(
        `Outbox request verification failed for request from ${senderFederation}. Rejecting request.`,
      );
      throw new BadRequestException('Invalid outbox request');
    }

    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
      throw new BadRequestException('Invalid outbox request timestamp');
    }
    if (Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000) {
      throw new BadRequestException('Outbox request timestamp is too old');
    }

    const requestNonceKey = `federation:outbox:request:${senderFederation}:${requestId}`;
    const isFreshRequest = await this.redis.set(
      requestNonceKey,
      '1',
      'EX',
      OUTBOX_REQUEST_TTL_SECONDS,
      'NX',
    );
    if (!isFreshRequest) {
      throw new BadRequestException(
        'Replay attack: outbox request already used',
      );
    }

    const messages = await this.collectPendingOutboxMessages(senderFederation);

    this.logger.debug(
      `Outbox request verified successfully for request from ${senderFederation}. Returning outbox messages.`,
    );
    return { messages };
  }

  private normalizeFederationUrl(value: string): string {
    return value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  private async collectPendingOutboxMessages(
    senderFederation: string,
  ): Promise<AnyFederationMessage[]> {
    const jobs = await this.federationOutgoingQueue.getJobs([
      'waiting',
      'delayed',
      'active',
      'prioritized',
    ]);

    const normalizedSenderFederation =
      this.normalizeFederationUrl(senderFederation);

    return jobs
      .map((job) => job.data)
      .filter((message): message is AnyFederationMessage =>
        Boolean(message?.targetFederation),
      )
      .filter(
        (message) =>
          this.normalizeFederationUrl(message.targetFederation) ===
          normalizedSenderFederation,
      )
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(0, OUTBOX_MAX_MESSAGES);
  }

  private getGetOutboxMessage = (
    senderFederationWithoutProto: string,
    requestId: string,
    timestamp: string,
  ) => {
    return `$$${MessagesBefore.GET_OUTBOX}$$${senderFederationWithoutProto}.${requestId}@${timestamp}`;
  };

  async handleHandshake(
    senderFederationWithProto: string,
    signature: string,
    requestId: string,
    timestamp: string,
  ) {
    const senderFederation = senderFederationWithProto.replace(
      /^https?:\/\//,
      '',
    );
    this.logger.debug(
      `Received handshake request from ${senderFederation} with request ID ${requestId} at timestamp ${timestamp}`,
    );
    const isValid = await this.verifyMessage(
      MessagesBefore.HANDSHAKE,
      senderFederationWithProto,
      signature,
      requestId,
      timestamp,
    );
    if (!isValid) {
      this.logger.warn(
        `Handshake message signature verification failed for request from ${senderFederation}. Possible tampering detected.`,
      );
      throw new BadRequestException('Invalid signature for handshake');
    }
    this.logger.debug(
      `Handshake message signature verified successfully for request from ${senderFederation}. Adding to known federations if not already present.`,
    );
    return this.getInfo();
  }
}
