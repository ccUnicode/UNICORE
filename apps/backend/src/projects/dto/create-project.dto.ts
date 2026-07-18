import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';
import { CreateProjectLinkDto } from './create-project-link.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimStringArray = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? (value as unknown[]).map((item) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;

export class CreateProjectDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  areaId: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateProjectLinkDto)
  links?: CreateProjectLinkDto[];
}
