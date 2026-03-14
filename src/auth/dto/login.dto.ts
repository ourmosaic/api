import { IsEmail, IsString, MinLength, ValidateIf } from "class-validator";
import errorCodes from "src/utils/errorCodes";

export class LoginDto {
    @ValidateIf(o => !o.email)
    @IsString()
    @MinLength(3, {message: errorCodes.USERNAME_TOO_SHORT})
    username?: string;

    @ValidateIf(o => !o.username)
    @IsEmail({}, {message: errorCodes.INVALID_EMAIL})
    email?: string;
    
    @IsString()
    @MinLength(8, {message: errorCodes.INVALID_PASSWORD_REQUIREMENTS})
    password: string;
}