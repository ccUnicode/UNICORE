import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';

const isDefined = (_object: unknown, value: unknown) => value !== undefined;
const isDefinedAndNotNull = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null;
const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTaskDto {
  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf(isDefinedAndNotNull)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf(isDefined)
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ValidateIf(isDefinedAndNotNull)
  @IsDateString()
  dueDate?: string | null;

  @ValidateIf(isDefinedAndNotNull)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  phaseId?: number | null;
}
