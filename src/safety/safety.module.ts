import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [SafetyController],
  imports: [PrismaModule],
})
export class SafetyModule {}
