import { ActivityState, AvailabilityState } from '../entities/members.entity';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';

export class UpdateMemberDto {
  @IsString()
  @Length(9, 9)
  @IsOptional()
  UniCode?: string;

  @IsString()
  @IsOptional()
  FullName?: string;

  @IsEmail()
  @IsOptional()
  Email?: string;

  @IsInt()
  @IsOptional()
  PhoneNumer?: number;

  @IsString()
  @IsOptional()
  Career?: string;

  @IsInt()
  @IsOptional()
  Semester?: number;

  @IsEnum(ActivityState)
  @IsOptional()
  Activity?: ActivityState;

  @IsEnum(AvailabilityState)
  @IsOptional()
  Disponibility?: AvailabilityState;
}
