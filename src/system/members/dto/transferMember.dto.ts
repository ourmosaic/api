import { IsUUID } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class TransferMemberDto {
  @IsUUID(undefined, { message: errorCodes.INVALID_SYSTEM_ID })
  targetSystemId: string;
}
