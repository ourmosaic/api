import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

const usernameRegex = /^[a-zA-Z0-9_]+$/;

export class RegisterDto {
  @IsEmail({}, { message: errorCodes.INVALID_EMAIL })
  email: string;

  @IsString({ message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  @MinLength(8, { message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  password: string;

  @IsString({ message: errorCodes.USERNAME_TOO_SHORT })
  @MinLength(3, { message: errorCodes.USERNAME_TOO_SHORT })
  @Matches(usernameRegex, { message: errorCodes.USERNAME_INVALID_CHARACTERS })
  username: string;
}
