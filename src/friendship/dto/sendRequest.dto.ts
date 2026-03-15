import { IsBoolean, IsEmail, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";
import errorCodes from "src/utils/errorCodes";

export class SendRequestDto {
    @IsUUID(4, {message: errorCodes.INVALID_USER_ID})
    recipientId: string;
}