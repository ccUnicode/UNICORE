import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProjectStatus } from '../enums/project-status.enum';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const toStringArray = ({ value }: { value: unknown }): unknown => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : value;

  return Array.isArray(values)
    ? (values as unknown[]).map((item) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : values;
};

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class GetProjectsFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  areaId?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique((label: unknown) =>
    typeof label === 'string' ? label.toLocaleLowerCase() : label,
  )
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  labels?: string[];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  archived?: boolean;
}
