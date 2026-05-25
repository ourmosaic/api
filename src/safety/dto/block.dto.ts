import { IsString, IsOptional, IsEnum } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';
import { BlockType } from '@prisma/client';

export class BlockDto {
  @IsEnum(BlockType, { message: errorCodes.BLOCK_TYPE_INVALID })
  type: BlockType;

  @IsString({ message: errorCodes.BLOCK_TARGET_ID_INVALID })
  targetId: string;

  @IsOptional()
  @IsString({ message: errorCodes.BLOCK_REASON_INVALID })
  reason?: string;
}

export class UnblockDto {
  @IsEnum(BlockType, { message: errorCodes.BLOCK_TYPE_INVALID })
  type: BlockType;

  @IsString({ message: errorCodes.BLOCK_TARGET_ID_INVALID })
  targetId: string;
}

