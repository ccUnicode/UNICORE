import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsString,
  Length,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimSkills = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => typeof item === 'string' && item.length > 0);
};

export class CreateMemberDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 20)
  uniCode: string;

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
