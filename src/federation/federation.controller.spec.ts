import { Test, TestingModule } from '@nestjs/testing';
import { FederationController } from './federation.controller';
import { FederationService } from './federation.service';

describe('FederationController', () => {
  let controller: FederationController;
  const federationServiceMock = {
    getInfo: jest.fn(),
    getFederationPublicKey: jest.fn(),
    handleHandshake: jest.fn(),
    receiveMessage: jest.fn(),
    getOutbox: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FederationController],
      providers: [
        {
          provide: FederationService,
          useValue: federationServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FederationController>(FederationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates outbox request to federation service', async () => {
    federationServiceMock.getOutbox.mockResolvedValue({ messages: [] });

    await controller.getOutbox('https://remote.example', 'sig', 'req-1', '1');

    expect(federationServiceMock.getOutbox).toHaveBeenCalledWith(
      'https://remote.example',
      'sig',
      'req-1',
      '1',
    );
  });
});
