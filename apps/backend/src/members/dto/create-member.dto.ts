import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeInstitution = ({ value }: { value: unknown }) => {
  if (value === undefined) {
    return 'UNI';
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized === '' ? '' : normalized.toUpperCase();
};

const trimSkills = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export class CreateMemberDto {
  @Transform(normalizeInstitution)
  @IsString()
  @Length(1, 120)
  institution: string = 'UNI';

  @Transform(trimString)
  @ValidateIf(
    (member: CreateMemberDto) =>
      member.institution === 'UNI' || member.studentCode !== undefined,
  )
  @IsString()
  @Length(1, 20)
  studentCode?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  firstNames: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  lastNames: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  major: string;

  @IsDateString()
  birthDate: string;

  @Transform(trimSkills)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills: string[];
}
