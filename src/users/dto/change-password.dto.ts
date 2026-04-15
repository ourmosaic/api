import { IsString, MinLength } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class ChangePasswordDto {
  @IsString({ message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  currentPassword: string;

  @IsString({ message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  @MinLength(8, { message: errorCodes.INVALID_PASSWORD_REQUIREMENTS })
  newPassword: string;
}
