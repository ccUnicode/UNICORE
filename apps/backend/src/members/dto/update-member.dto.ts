import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MemberActivityStatus } from '../enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeInstitution = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ').toUpperCase();
};

const trimSkills = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((item) => item.length > 0);
};

export class UpdateMemberDto {
  @Transform(normalizeInstitution)
  @IsString()
  @Length(1, 120)
  @IsOptional()
  institution?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 20)
  @IsOptional()
  studentCode?: string | null;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  @IsOptional()
  firstNames?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  @IsOptional()
  lastNames?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  @IsOptional()
  major?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @Transform(trimSkills)
  @IsArray()
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  @IsOptional()
  skills?: string[];

  @IsEnum(MemberActivityStatus)
  @IsOptional()
  activityStatus?: MemberActivityStatus;

  @IsEnum(MemberAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: MemberAvailabilityStatus;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  areaId?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cycle?: number | null;
}
