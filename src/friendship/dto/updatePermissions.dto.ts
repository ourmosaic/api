import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFriendshipPermissionsDto {
  @IsOptional()
  @IsBoolean()
  canViewFront?: boolean;

  @IsOptional()
  @IsBoolean()
  canReceiveFrontNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewSharedMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMeOnFriendFrontChange?: boolean;
}

