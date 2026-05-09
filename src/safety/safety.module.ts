import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SafetyService } from './safety.service';

@Module({
  controllers: [SafetyController],
  imports: [PrismaModule, AuthModule],
  providers: [SafetyService],
})
export class SafetyModule {}
