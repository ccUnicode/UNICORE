import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';
import { CreateProjectLinkDto } from './create-project-link.dto';

const isDefined = (_object: unknown, value: unknown) => value !== undefined;
const isDefinedAndNotNull = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimStringArray = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? (value as unknown[]).map((item) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;

export class UpdateProjectDto {
  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ValidateIf(isDefinedAndNotNull)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf(isDefinedAndNotNull)
  @IsDateString()
  startDate?: string | null;

  @ValidateIf(isDefinedAndNotNull)
  @IsDateString()
  endDate?: string | null;

  @ValidateIf(isDefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  areaId?: number;

  @ValidateIf(isDefined)
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ValidateIf(isDefined)
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique((label: unknown) =>
    typeof label === 'string' ? label.toLocaleLowerCase() : label,
  )
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  labels?: string[];

  @ValidateIf(isDefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateProjectLinkDto)
  links?: CreateProjectLinkDto[];
}
