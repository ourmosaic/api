import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticationResponseDto } from './dto/authentication.result.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Version(VERSION_NEUTRAL)
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<AuthenticationResponseDto> {
    return this.authService.registerUser(registerDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthenticationResponseDto> {
    return this.authService.login(loginDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('token/refresh')
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthenticationResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('session')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request): Promise<void> {
    await this.authService.logout(req);
    return;
  }

  @Version(VERSION_NEUTRAL)
  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: User): User {
    return user;
  }
}
