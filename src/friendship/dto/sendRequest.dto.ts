import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class SendRequestDto {
  @ValidateIf((o) => !o.username)
  @IsUUID(4, { message: errorCodes.INVALID_USER_ID })
  recipientId?: string;

  @ValidateIf((o) => !o.recipientId)
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  federationUrl?: string;
}
