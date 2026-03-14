import { SystemInterceptor } from './system.interceptor';
import { PrismaService } from '../prisma/prisma.service';

describe('SystemInterceptor', () => {
  it('should be defined', () => {
    const mockPrismaService = {} as PrismaService;
    expect(new SystemInterceptor(mockPrismaService)).toBeDefined();
  });
});
