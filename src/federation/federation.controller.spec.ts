import { Test, TestingModule } from '@nestjs/testing';
import { FederationController } from './federation.controller';

describe('FederationController', () => {
  let controller: FederationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FederationController],
    }).compile();

    controller = module.get<FederationController>(FederationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
