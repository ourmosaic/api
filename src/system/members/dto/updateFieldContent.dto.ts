import { IsString, IsOptional, IsEnum } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class UpdateFieldContentDto {
  @IsOptional()
  @IsString({ message: errorCodes.CUSTOM_FIELD_VALUE_INVALID })
  value: string;
}
