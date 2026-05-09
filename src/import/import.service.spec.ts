import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SystemService } from '../system/system.service';
import { ImportService } from './import.service';
import { RedisService } from '../redis/redis.service';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: SystemService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
