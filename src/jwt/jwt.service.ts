import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSigner, createVerifier, SignerSync, VerifierSync } from 'fast-jwt';

@Injectable()
export class JwtService {
    private readonly accessTokenSigner: typeof SignerSync;
    private readonly refreshTokenSigner: typeof SignerSync;
    private readonly accessTokenVerifier: typeof VerifierSync;
    private readonly refreshTokenVerifier: typeof VerifierSync;

    constructor(private readonly configService: ConfigService) {
        const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
        if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
        if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
        this.accessTokenSigner = createSigner({ key: accessSecret, expiresIn: '7d' });
        this.refreshTokenSigner = createSigner({ key: refreshSecret, expiresIn: `90d` });
        this.accessTokenVerifier = createVerifier({ key: accessSecret });
        this.refreshTokenVerifier = createVerifier({ key: refreshSecret });
    }

    generateAccessToken(redisId: string) {
        return this.accessTokenSigner({ sub: redisId });
    }

    generateRefreshToken(redisId: string) {
        return this.refreshTokenSigner({ sub: redisId });
    }

    verifyAccessToken(token: string) {
        try {
            return this.accessTokenVerifier(token);
        } catch (err) {
            return null;
        }
    }

    verifyRefreshToken(token: string) {
        try {
            return this.refreshTokenVerifier(token);
        } catch (err) {
            return null;
        }
    }
}
