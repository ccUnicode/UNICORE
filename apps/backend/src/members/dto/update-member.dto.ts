import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { MemberActivityStatus } from '../enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';

export class UpdateMemberDto {
  @IsEnum(MemberActivityStatus)
  @IsOptional()
  activityStatus?: MemberActivityStatus;

  @IsEnum(MemberAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: MemberAvailabilityStatus;

  @IsEnum(MemberAvailabilityStatus)
  @IsOptional()
  status?: MemberAvailabilityStatus;

  @IsInt()
  @IsOptional()
  areaId?: number | null;
}
