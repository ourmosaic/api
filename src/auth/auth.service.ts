import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from 'src/jwt/jwt.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import argon2id from 'argon2';
import crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticationResponseDto } from './dto/authentication.result.dto';
import errorCodes from 'src/utils/errorCodes';
import type { Request } from 'express';

@Injectable()
export class AuthService {
    private readonly accessTokenExpiry = 7 * 24 * 60 * 60;
    private readonly refreshTokenExpiry = 90 * 24 * 60 * 60;
    private readonly redisPrefix = 'auth:';
    private readonly redisRefreshTokenPrefix = 'refresh:';
    private readonly redisAccessTokenPrefix = 'access:';

    constructor(
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService
    ) {}

    async registerUser(data: RegisterDto) : Promise<AuthenticationResponseDto> {
        const existingUser = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        });
        if (existingUser) {
            throw new UnauthorizedException(errorCodes.USER_ALREADY_EXISTS);
        }
        

        const newUser = await this.prismaService.user.create({
            data: {
                email: data.email,
                username: data.username,
                password: await argon2id.hash(data.password),
            }
        });

        return this.generateTokensForUser(newUser.id);
    }

    async login(data: LoginDto) : Promise<AuthenticationResponseDto> {
        const user = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        });
        if (!user) {
            throw new UnauthorizedException(errorCodes.USER_NOT_FOUND);
        }
        
        const passwordValid = await argon2id.verify(user.password, data.password);
        if (!passwordValid) {
            throw new UnauthorizedException(errorCodes.INVALID_CREDENTIALS);
        }

        return this.generateTokensForUser(user.id);
    }

    async refreshTokens(refreshToken: string) : Promise<AuthenticationResponseDto> {
        const payload = this.jwtService.verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new UnauthorizedException(errorCodes.REFRESH_TOKEN_INVALID);
        }
        const redisRefreshTokenKey = `${this.redisPrefix}${this.redisRefreshTokenPrefix}${payload.sub}`;
        const redisRefreshTokenDataString = await this.redisService.get(redisRefreshTokenKey);
        if (!redisRefreshTokenDataString) {
            throw new UnauthorizedException(errorCodes.REFRESH_TOKEN_INVALID);
        }
        const redisRefreshTokenData = JSON.parse(redisRefreshTokenDataString);
        if (redisRefreshTokenData.accessToken) {
            await this.revokeAccessToken(redisRefreshTokenData.accessToken);
        }
        await this.revokeRefreshToken(payload.sub);
        return this.generateTokensForUser(redisRefreshTokenData.userId);
    }

    private async revokeAccessToken(redisAccessToken: string) {
        const redisAccessTokenKey = `${this.redisPrefix}${this.redisAccessTokenPrefix}${redisAccessToken}`;
        await this.redisService.del(redisAccessTokenKey);
    }

    private async revokeRefreshToken(redisRefreshToken: string) {
        const redisRefreshTokenKey = `${this.redisPrefix}${this.redisRefreshTokenPrefix}${redisRefreshToken}`;
        await this.redisService.del(redisRefreshTokenKey);
    }

    private async generateTokensForUser(userId: string) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });
        if (!user) {
            throw new UnauthorizedException(errorCodes.USER_NOT_FOUND);
        }
        const redisAccessTokenData = {
            userId: user.id
        }
        const redisAccessToken = crypto.randomBytes(32).toString('hex');
        const redisAccessTokenKey = `${this.redisPrefix}${this.redisAccessTokenPrefix}${redisAccessToken}`;
        await this.redisService.set(redisAccessTokenKey, JSON.stringify(redisAccessTokenData), 'EX', this.accessTokenExpiry);

        const redisRefreshTokenData = {
            userId: user.id,
            accessToken: redisAccessToken
        }
        const redisRefreshToken = crypto.randomBytes(32).toString('hex');
        const redisRefreshTokenKey = `${this.redisPrefix}${this.redisRefreshTokenPrefix}${redisRefreshToken}`;
        await this.redisService.set(redisRefreshTokenKey, JSON.stringify(redisRefreshTokenData), 'EX', this.refreshTokenExpiry);

        const accessToken = this.jwtService.generateAccessToken(redisAccessToken);
        const refreshToken = this.jwtService.generateRefreshToken(redisRefreshToken);

        return {
            accessToken,
            refreshToken,
            accessTokenExpiresIn: this.accessTokenExpiry,
            refreshTokenExpiresIn: this.refreshTokenExpiry,
        }
    }

    async getUserFromAccessToken(token: string) {
        const payload = this.jwtService.verifyAccessToken(token);
        if (!payload) {
            throw new UnauthorizedException(errorCodes.INVALID_ACCESS_TOKEN);
        }
        const redisAccessTokenKey = `${this.redisPrefix}${this.redisAccessTokenPrefix}${payload.sub}`;
        const redisAccessTokenDataString = await this.redisService.get(redisAccessTokenKey);
        if (!redisAccessTokenDataString) {
            throw new UnauthorizedException(errorCodes.INVALID_ACCESS_TOKEN);
        }
        const redisAccessTokenData = JSON.parse(redisAccessTokenDataString);
        const user = await this.prismaService.user.findUnique({
            where: { id: redisAccessTokenData.userId },
            select: { 
                // all except password
                id: true,
                email: true,
                username: true,
                createdAt: true,
                updatedAt: true,
                isSystem: true,
                system: true,
             }
        });
        if (!user) {
            throw new UnauthorizedException(errorCodes.USER_NOT_FOUND);
        }
        return user;
    }

    async getUserIdFromAccessToken(token: string) {
        const payload = this.jwtService.verifyAccessToken(token);
        if (!payload) {
            throw new UnauthorizedException(errorCodes.INVALID_ACCESS_TOKEN);
        }
        const redisAccessTokenKey = `${this.redisPrefix}${this.redisAccessTokenPrefix}${payload.sub}`;
        const redisAccessTokenDataString = await this.redisService.get(redisAccessTokenKey);
        if (!redisAccessTokenDataString) {
            throw new UnauthorizedException(errorCodes.INVALID_ACCESS_TOKEN);
        }
        const redisAccessTokenData = JSON.parse(redisAccessTokenDataString);
        return redisAccessTokenData.userId;
    }

    async logout(req: Request) {
        const authHeader = req.headers['authorization'];
        const refreshToken = req.headers['x-refresh-token'] as string;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = this.jwtService.verifyAccessToken(token);
            if (payload) {
                await this.revokeAccessToken(payload.sub);
                if (refreshToken) {
                    const refreshPayload = this.jwtService.verifyRefreshToken(refreshToken);
                    if (refreshPayload) {
                        await this.revokeRefreshToken(refreshPayload.sub);
                    }
                }
            }
        }
    }
}
