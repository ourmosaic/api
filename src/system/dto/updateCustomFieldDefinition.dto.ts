import { IsEmail, IsString, MinLength, ValidateIf, IsOptional, IsEnum, IsNumber } from "class-validator";
import errorCodes from "src/utils/errorCodes";

export enum FieldType {
    STRING = "STRING",
    LONG_TEXT = "LONG_TEXT",
    COLOR = "COLOR",
    DATE = "DATE",
    NUMBER = "NUMBER"
}

enum Privacy {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
    FRIENDS = 'FRIENDS'
}

export class UpdateCustomFieldDefinitionDto {
    @IsOptional()
    @IsString({message: errorCodes.CUSTOM_FIELD_NAME_INVALID})
    name?: string;

    @IsOptional()
    @IsEnum(FieldType, {message: errorCodes.CUSTOM_FIELD_TYPE_INVALID})
    type?: FieldType;

    @IsOptional()
    @IsNumber({}, {message: errorCodes.CUSTOM_FIELD_ORDER_INVALID})
    order?: number;

    @IsOptional()
    @IsEnum(Privacy, {message: errorCodes.INVALID_PRIVACY_SETTING})
    privacy?: Privacy;
}