import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import errorCodes from 'src/utils/errorCodes';

export enum QueryType {
  USER_EXISTS = 'USER_EXISTS',
  SYSTEM_EXISTS = 'SYSTEM_EXISTS',
  GET_USER = 'GET_USER',
  GET_SYSTEM = 'GET_SYSTEM',
  GET_FRONT = 'GET_FRONT',
}

export class QueryDto {
  @IsEnum(QueryType, { message: errorCodes.INVALID_QUERY_TYPE })
  type: QueryType;

  @ValidateIf((o: QueryDto) => o.type === QueryType.USER_EXISTS)
  @IsString({ message: errorCodes.USERNAME_INVALID })
  @MinLength(3, { message: errorCodes.USERNAME_TOO_SHORT })
  username?: string;

  @ValidateIf((o: QueryDto) => o.type === QueryType.USER_EXISTS)
  @IsEmail({}, { message: errorCodes.INVALID_EMAIL })
  email?: string;

  @ValidateIf(
    (o: QueryDto) =>
      o.type === QueryType.USER_EXISTS || o.type === QueryType.GET_USER,
  )
  @IsString({ message: errorCodes.INVALID_USER_ID })
  userId?: string;

  @ValidateIf(
    (o: QueryDto) =>
      o.type === QueryType.SYSTEM_EXISTS ||
      o.type === QueryType.GET_SYSTEM ||
      o.type === QueryType.GET_FRONT,
  )
  @IsString({ message: errorCodes.SYSTEM_NAME_INVALID })
  @MinLength(3, { message: errorCodes.SYSTEM_NAME_INVALID })
  systemId?: string;

  @ValidateIf(
    (o: QueryDto) =>
      o.type === QueryType.GET_FRONT ||
      o.type === QueryType.GET_SYSTEM ||
      o.type === QueryType.GET_USER,
  )
  @IsString({ message: errorCodes.INVALID_USER_ID })
  @MinLength(3, { message: errorCodes.INVALID_USER_ID })
  distantRequesterId?: string;
}
