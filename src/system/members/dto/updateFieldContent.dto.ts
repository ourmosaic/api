import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

enum Privacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
}

export class UpdateFieldContentDto {
  @IsOptional()
  @IsString({ message: errorCodes.CUSTOM_FIELD_VALUE_INVALID })
  value: string;
}
