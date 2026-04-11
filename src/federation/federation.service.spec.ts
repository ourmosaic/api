import { BadRequestException } from '@nestjs/common';
import { FederationService } from './federation.service';
import {
  FederationMessageType,
  FrontUpdateEvent,
  type AnyFederationMessage,
} from './federationDef';

describe('FederationService', () => {
  type FederationServiceDeps = ConstructorParameters<typeof FederationService>;
  type FrontUpdateMessage = Extract<
    AnyFederationMessage,
    { type: FederationMessageType.FRONT_UPDATE }
  >;

  let service: FederationService;
  let redisSetMock: jest.Mock;
  let redisPublishMock: jest.Mock;
  let queueGetJobsMock: jest.Mock;
  let queueAddMock: jest.Mock;
  let knownFederationFindManyMock: jest.Mock;
  let knownFederationFindUniqueMock: jest.Mock;

  const createMessage = (
    targetFederation: string,
    timestamp: number,
  ): AnyFederationMessage => ({
    type: FederationMessageType.FRIEND_REQUEST,
    timestamp,
    targetFederation,
    senderUsername: 'alice',
    recipientUsername: 'bob',
  });

  const createFrontUpdateMessage = (): Omit<
    FrontUpdateMessage,
    'targetFederation' | 'signature' | 'nonce'
  > => ({
    type: FederationMessageType.FRONT_UPDATE,
    timestamp: Date.now(),
    systemId: 'system-1',
    memberId: 'member-1',
    frontId: 'session-1',
    event: FrontUpdateEvent.FRONT_SESSION_STARTED,
  });

  beforeEach(() => {
    redisSetMock = jest.fn().mockResolvedValue('OK');
    redisPublishMock = jest.fn().mockResolvedValue(1);
    queueGetJobsMock = jest.fn().mockResolvedValue([]);
    queueAddMock = jest.fn().mockResolvedValue(undefined);
    knownFederationFindManyMock = jest.fn().mockResolvedValue([]);
    knownFederationFindUniqueMock = jest.fn().mockResolvedValue({
      url: 'remote.example',
      publicKey: '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----',
    });

    const prismaMock = {
      knownFederation: {
        findMany: knownFederationFindManyMock,
        findUnique: knownFederationFindUniqueMock,
      },
    } as unknown as FederationServiceDeps[0];
    const membersServiceMock = {} as FederationServiceDeps[1];
    const usersServiceMock = {} as FederationServiceDeps[2];
    const systemServiceMock = {} as FederationServiceDeps[3];
    const friendshipServiceMock = {} as FederationServiceDeps[4];
    const groupsServiceMock = {} as FederationServiceDeps[5];
    const redisMock = {
      set: redisSetMock,
      publish: redisPublishMock,
    } as unknown as FederationServiceDeps[6];
    const configServiceMock = {
      get: jest.fn((key: string) =>
        key === 'INSTANCE_ADDR' ? 'local.instance.example' : undefined,
      ),
    } as unknown as FederationServiceDeps[7];
    const queueMock = {
      getJobs: queueGetJobsMock,
      add: queueAddMock,
    } as unknown as FederationServiceDeps[8];

    service = new FederationService(
      prismaMock,
      membersServiceMock,
      usersServiceMock,
      systemServiceMock,
      friendshipServiceMock,
      groupsServiceMock,
      redisMock,
      configServiceMock,
      queueMock,
    );
  });

  it('returns only pending messages for requesting federation', async () => {
    jest.spyOn(service, 'verifyOutboxRequest').mockResolvedValue(true);
    queueGetJobsMock.mockResolvedValue([
      { data: createMessage('remote.example', 3) },
      { data: createMessage('https://remote.example', 1) },
      { data: createMessage('other.example', 2) },
    ]);

    const result = await service.getOutbox(
      'https://remote.example',
      'sig',
      'req-1',
      `${Date.now()}`,
    );

    expect(result.messages).toHaveLength(2);
    expect(result.messages.map((message) => message.timestamp)).toEqual([1, 3]);
  });

  it('rejects replayed outbox request IDs', async () => {
    jest.spyOn(service, 'verifyOutboxRequest').mockResolvedValue(true);
    redisSetMock.mockResolvedValue(null);

    await expect(
      service.getOutbox(
        'https://remote.example',
        'sig',
        'req-dup',
        `${Date.now()}`,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid timestamp values', async () => {
    jest.spyOn(service, 'verifyOutboxRequest').mockResolvedValue(true);

    await expect(
      service.getOutbox(
        'https://remote.example',
        'sig',
        'req-2',
        'not-a-number',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('broadcasts front updates to all known federations', async () => {
    knownFederationFindManyMock.mockResolvedValue([
      { url: 'one.example' },
      { url: 'two.example' },
    ]);

    await service.broadcastMessageToKnownFederations(
      createFrontUpdateMessage(),
    );

    expect(queueAddMock).toHaveBeenCalledTimes(2);
  });

  it('broadcasts only to targeted known federations', async () => {
    knownFederationFindManyMock.mockResolvedValue([{ url: 'one.example' }]);

    const targetedBroadcaster = service as unknown as {
      broadcastMessageToFederations: (
        message: Omit<
          FrontUpdateMessage,
          'targetFederation' | 'signature' | 'nonce'
        >,
        targetFederations: string[],
      ) => Promise<void>;
    };

    await targetedBroadcaster.broadcastMessageToFederations(
      createFrontUpdateMessage(),
      ['https://one.example', 'unknown.example', 'one.example'],
    );

    expect(knownFederationFindManyMock).toHaveBeenCalledWith({
      where: { url: { in: ['one.example', 'unknown.example'] } },
      select: { url: true },
    });
    expect(queueAddMock).toHaveBeenCalledTimes(1);
  });

  it('publishes incoming FRONT_UPDATE messages on federated notification channel', async () => {
    jest.spyOn(service, 'verifyMessageIntegrity').mockReturnValue(true);

    const response = await service.receiveMessage(
      {
        type: FederationMessageType.FRONT_UPDATE,
        timestamp: Date.now(),
        targetFederation: 'local.instance.example',
        nonce: 'nonce-1',
        event: FrontUpdateEvent.FRONT_SESSION_STARTED,
        systemId: 'system-1',
        memberId: 'member-1',
        frontId: 'session-1',
      },
      'https://remote.example',
      'signature',
    );

    expect(response).toEqual({
      message: 'Front update processed successfully',
    });
    expect(redisPublishMock).toHaveBeenCalledWith(
      'federation:frontSessions',
      expect.any(String),
    );
  });
});
