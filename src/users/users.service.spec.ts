import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import argon2id from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('argon2', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    hash: jest.fn(),
  },
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns current user when found', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'demo',
      email: 'demo@test.dev',
    });

    await expect(service.getCurrentUser('u1')).resolves.toEqual({
      id: 'u1',
      username: 'demo',
      email: 'demo@test.dev',
    });
  });

  it('throws conflict when updating with existing username/email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u2' });

    await expect(
      service.updateCurrentUser('u1', { username: 'taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws unauthorized when current password is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      password: 'hashed',
    });
    (argon2id.verify as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'bad-password',
        newPassword: 'new-password-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
