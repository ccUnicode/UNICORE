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
import { MemberActivityStatus } from '../enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';

export class GetMembersFilterDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const match = Object.values(MemberAvailabilityStatus).find(
        (status) => status.toLowerCase() === value.toLowerCase(),
      );
      return match || value;
    }
    return value;
  })
  @IsEnum(MemberAvailabilityStatus)
  status?: MemberAvailabilityStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const match = Object.values(MemberActivityStatus).find(
        (status) => status.toLowerCase() === value.toLowerCase(),
      );
      return match || value;
    }
    return value;
  })
  @IsEnum(MemberActivityStatus)
  activityStatus?: MemberActivityStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const match = Object.values(MemberAvailabilityStatus).find(
        (status) => status.toLowerCase() === value.toLowerCase(),
      );
      return match || value;
    }
    return value;
  })
  @IsEnum(MemberAvailabilityStatus)
  availabilityStatus?: MemberAvailabilityStatus;

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
