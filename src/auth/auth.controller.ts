import { Body, Controller, Get, Post, Req, UseGuards, Version } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticationResponseDto } from './dto/authentication.result.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { Request } from 'express';
import { User } from '@prisma/client';
import { RefreshTokenDto } from './dto/refreshToken.dto';

export type RequestWithUser = Request & {user: User};

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @Version('1')
    @Post('register')
    async register(@Body() registerDto: RegisterDto): Promise<AuthenticationResponseDto> {
        return this.authService.registerUser(registerDto);
    }

    @Version('1')
    @Post('login')
    async login(@Body() loginDto: LoginDto): Promise<AuthenticationResponseDto> {
        return this.authService.login(loginDto);
    }

    @Version('1')
    @Post('token/refresh')
    async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthenticationResponseDto> {
        return this.authService.refreshTokens(refreshTokenDto.refreshToken);
    }

    @Version('1')
    @Get('me')
    @UseGuards(AuthGuard)
    async getMe(@Req() req: RequestWithUser) {
        return req.user;
    }
}
