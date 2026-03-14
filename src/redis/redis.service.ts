import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    constructor(private readonly configService: ConfigService) {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) throw new Error('REDIS_URL is not defined in environment variables');
        super(redisUrl);
        this.on('connect', () => {
            this.logger.log('Connected to Redis');
        })

        this.on('error', (err) => {
            this.logger.error('Error connecting to Redis', err);
        })
    }

    onModuleDestroy() {
        this.disconnect();
    }

}
