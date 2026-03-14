import { IsEmail, IsString, MinLength, ValidateIf, IsOptional } from "class-validator";
import errorCodes from "src/utils/errorCodes";

export class CreateGroupDto {
    @IsOptional()
    @IsString({message: errorCodes.GROUP_NAME_INVALID})
    @MinLength(3, {message: errorCodes.GROUP_NAME_INVALID})
    name?: string;

    @IsOptional()
    @IsString({message: errorCodes.GROUP_COLOR_INVALID})
    color?: string;

    @IsOptional()
    @IsString({message: errorCodes.GROUP_ICON_INVALID})
    icon?: string;

    @IsOptional()
    @IsString({message: errorCodes.GROUP_PARENT_ID_INVALID})
    parentId?: string;
}