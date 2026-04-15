import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class UpdateMeDto {
  @IsOptional()
  @IsEmail({}, { message: errorCodes.INVALID_EMAIL })
  email?: string;

  @IsOptional()
  @IsString({ message: errorCodes.USERNAME_TOO_SHORT })
  @MinLength(3, { message: errorCodes.USERNAME_TOO_SHORT })
  username?: string;
}
