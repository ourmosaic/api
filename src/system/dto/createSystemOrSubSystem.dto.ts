import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class CreateSystemOrSubSystemDto {
  @IsOptional()
  @IsString({ message: errorCodes.SYSTEM_NAME_INVALID })
  @MinLength(3, { message: errorCodes.SYSTEM_NAME_INVALID })
  customName?: string;

  @IsOptional()
  @IsString({ message: errorCodes.SYSTEM_DESCRIPTION_INVALID })
  description?: string;

  @IsOptional()
  @IsUUID()
  parent?: string;
}
