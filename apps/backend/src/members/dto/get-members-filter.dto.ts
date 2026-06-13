import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { MemberStatus } from '../enums/member-status.enum';

export class GetMembersFilterDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
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
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const parsed = Number(value);
      return isNaN(parsed) || value.trim() === '' ? value : parsed;
    }
    return value;
  })
  @IsNumber()
  areaId?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return value;

    let arr: unknown[] = [];
    if (typeof value === 'string') arr = [value];
    else if (Array.isArray(value)) arr = value;
    else return value;

    return arr.map((item) => {
      if (typeof item === 'string') {
        return item.trim().replace(/\s+/g, ' ').toLowerCase();
      }
      return item;
    });
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills?: string[];
}
