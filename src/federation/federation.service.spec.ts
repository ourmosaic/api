import { BadRequestException } from '@nestjs/common';
import { FederationService } from './federation.service';
import {
  FederationMessageType,
  type AnyFederationMessage,
} from './federationDef';

describe('FederationService', () => {
  type FederationServiceDeps = ConstructorParameters<typeof FederationService>;

  let service: FederationService;
  let redisSetMock: jest.Mock;
  let queueGetJobsMock: jest.Mock;

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

  beforeEach(() => {
    redisSetMock = jest.fn().mockResolvedValue('OK');
    queueGetJobsMock = jest.fn().mockResolvedValue([]);

    const prismaMock = {} as FederationServiceDeps[0];
    const membersServiceMock = {} as FederationServiceDeps[1];
    const usersServiceMock = {} as FederationServiceDeps[2];
    const systemServiceMock = {} as FederationServiceDeps[3];
    const friendshipServiceMock = {} as FederationServiceDeps[4];
    const groupsServiceMock = {} as FederationServiceDeps[5];
    const redisMock = {
      set: redisSetMock,
    } as unknown as FederationServiceDeps[6];
    const configServiceMock = {
      get: jest.fn((key: string) =>
        key === 'INSTANCE_ADDR' ? 'local.instance.example' : undefined,
      ),
    } as unknown as FederationServiceDeps[7];
    const queueMock = {
      getJobs: queueGetJobsMock,
      add: jest.fn(),
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
});
