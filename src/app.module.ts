import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from './jwt/jwt.module';
import { SystemModule } from './system/system.module';
import { ImportModule } from './import/import.module';
import { StorageModule } from './storage/storage.module';
import { FriendshipModule } from './friendship/friendship.module';
import { UsersModule } from './users/users.module';
import { FederationModule } from './federation/federation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SafetyService } from './safety/safety.service';
import { SafetyService } from './safety/safety.service';
import { SafetyModule } from './safety/safety.module';
import { SecurityModule } from './security/security.module';
import { RateLimitModule } from './security/rate-limit.module';
import { DosProtectionMiddleware } from './security/dos-protection.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    JwtModule,
    SystemModule,
    ImportModule,
    StorageModule,
    FriendshipModule,
    UsersModule,
    FederationModule,
    NotificationsModule,
    SafetyModule,
    SecurityModule,
    RateLimitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DosProtectionMiddleware).forRoutes('*');
  }
}
