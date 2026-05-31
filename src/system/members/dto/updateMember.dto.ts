import { IsString, MinLength, IsOptional, IsEnum, Matches, IsBoolean } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

enum Privacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString({ message: errorCodes.INVALID_MEMBER_NAME })
  @MinLength(1, { message: errorCodes.INVALID_MEMBER_NAME })
  name?: string;

  @IsOptional()
  @IsString({ message: errorCodes.INVALID_DESCRIPTION })
  description?: string;

  @IsOptional()
  @IsString({ message: errorCodes.INVALID_PRONOUNS })
  pronouns?: string;

  @IsOptional()
  @IsString({ message: errorCodes.INVALID_ROLE_NAME })
  @MinLength(3, { message: errorCodes.INVALID_ROLE_NAME })
  role?: string;

  @IsOptional()
  @IsEnum(Privacy, { message: errorCodes.INVALID_PRIVACY_SETTING })
  privacy?: Privacy;

  @IsOptional()
  @IsString({ message: errorCodes.INVALID_COLOR })
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$/, { message: errorCodes.INVALID_COLOR })
  @MinLength(7, { message: errorCodes.INVALID_COLOR })
  color?: string;

  @IsOptional()
  @IsBoolean()
  inDormancy?: boolean;
}
