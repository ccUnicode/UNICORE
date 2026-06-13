import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { MemberStatus } from '../enums/member-status.enum';

export class UpdateMemberDto {
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @IsInt()
  @IsOptional()
  areaId?: number | null;
}
