import { IsString, MinLength } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class RefreshTokenDto {
  @IsString({ message: errorCodes.REFRESH_TOKEN_INVALID })
  @MinLength(64, { message: errorCodes.REFRESH_TOKEN_INVALID })
  refreshToken: string;
}
