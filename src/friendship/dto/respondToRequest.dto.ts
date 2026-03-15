import { IsBoolean, IsEmail, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";
import errorCodes from "src/utils/errorCodes";

export class RespondToRequestDto {
    @IsUUID(4, {message: errorCodes.INVALID_USER_ID})
    requestId: string;

    @IsBoolean({message: errorCodes.INVALID_ACCEPT_VALUE})
    accept: boolean;
}