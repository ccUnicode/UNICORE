import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberStatus } from '../enums/member-status.enum';

export class GetMembersFilterDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const match = Object.values(MemberStatus).find(
        (status) => status.toLowerCase() === value.toLowerCase(),
      );
      return match || value;
    }
    return value;
  })
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = Number(value);
      return isNaN(parsed) || value.trim() === '' ? value : parsed;
    }
    return value;
  })
  @IsNumber()
  areaId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;

    let arr: any[] = [];
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
