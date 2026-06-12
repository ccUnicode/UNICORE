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

const normalizeEnumValue = <T extends string>(
  value: unknown,
  values: readonly T[],
): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return (
    values.find((status) => status.toLowerCase() === value.toLowerCase()) ??
    value
  );
};

const normalizeNumber = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) || value.trim() === '' ? value : parsed;
};

const normalizeSkills = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  const items: readonly unknown[] =
    typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];

  if (
    items.length === 0 &&
    !Array.isArray(value) &&
    typeof value !== 'string'
  ) {
    return value;
  }

  return items.map((item) =>
    typeof item === 'string'
      ? item.trim().replace(/\s+/g, ' ').toLowerCase()
      : item,
  );
};

export class GetMembersFilterDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    normalizeEnumValue(value, Object.values(MemberAvailabilityStatus)),
  )
  @IsEnum(MemberAvailabilityStatus)
  status?: MemberAvailabilityStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    normalizeEnumValue(value, Object.values(MemberActivityStatus)),
  )
  @IsEnum(MemberActivityStatus)
  activityStatus?: MemberActivityStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    normalizeEnumValue(value, Object.values(MemberAvailabilityStatus)),
  )
  @IsEnum(MemberAvailabilityStatus)
  availabilityStatus?: MemberAvailabilityStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeNumber(value))
  @IsNumber()
  areaId?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeSkills(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills?: string[];
}
