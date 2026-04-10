import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MemberStatus } from '../member.entity';

export class GetMembersFilterDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    return value;
  })
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
    
    let arr = [];
    if (typeof value === 'string') arr = [value];
    else if (Array.isArray(value)) arr = value;
    else return undefined;

    return arr
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().replace(/\s+/g, ' ').toLowerCase())
      .filter((item) => item.length > 0);
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
