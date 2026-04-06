import { FriendshipType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export class UpdateFriendshipTypeDto {
  @IsEnum(FriendshipType, { message: errorCodes.INVALID_FRIENDSHIP_TYPE })
  type: FriendshipType;
}
