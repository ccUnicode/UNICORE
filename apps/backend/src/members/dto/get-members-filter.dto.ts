import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MemberStatus } from '../member.entity';

export class GetMembersFilterDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  areaId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    if (typeof value === 'string') return [value];
    return Array.isArray(value) ? value : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
