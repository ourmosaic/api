import { IsEmail, IsString, MinLength } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class RegisterDto {
  @IsEmail({}, { message: errorCodes.INVALID_EMAIL })
  email: string;

  @IsString({ message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  @MinLength(8, { message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  password: string;

  @IsString({ message: errorCodes.USERNAME_TOO_SHORT })
  @MinLength(3, { message: errorCodes.USERNAME_TOO_SHORT })
  username: string;
}
