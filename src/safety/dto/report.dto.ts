import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import errorCodes from 'src/utils/errorCodes';
import { ReportType } from '@prisma/client';

export class ReportDto {
  @IsEnum(ReportType, { message: errorCodes.REPORT_TYPE_INVALID })
  type: ReportType;

  @IsString({ message: errorCodes.REPORT_TARGET_ID_INVALID })
  targetId: string;

  @IsOptional()
  @IsString({ message: errorCodes.REPORT_REASON_INVALID })
  @MinLength(10, { message: errorCodes.REPORT_REASON_TOO_SHORT })
  reason?: string;
}
