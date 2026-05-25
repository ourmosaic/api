import { forwardRef, Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SafetyService } from './safety.service';
import { FederationModule } from '../federation/federation.module';

@Module({
  controllers: [SafetyController],
  imports: [PrismaModule, AuthModule, forwardRef(() => FederationModule)],
  providers: [SafetyService],
})
export class SafetyModule {}
