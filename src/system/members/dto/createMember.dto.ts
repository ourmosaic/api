import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

enum Privacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
}

export class CreateMemberDto {
  @IsString({ message: errorCodes.INVALID_MEMBER_NAME })
  @MinLength(3, { message: errorCodes.INVALID_MEMBER_NAME })
  name: string;

  @IsString({ message: errorCodes.INVALID_DESCRIPTION })
  @IsOptional()
  description?: string;

  @IsString({ message: errorCodes.INVALID_PRONOUNS })
  @IsOptional()
  pronouns?: string;

  @IsOptional()
  @IsString({ message: errorCodes.INVALID_ROLE_NAME })
  @MinLength(3, { message: errorCodes.INVALID_ROLE_NAME })
  role?: string;

  @IsOptional()
  @IsEnum(Privacy, { message: errorCodes.INVALID_PRIVACY_SETTING })
  privacy?: Privacy;
}
