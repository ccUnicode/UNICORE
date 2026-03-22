import { ActivityState, AvailabilityState } from '../entities/members.entity';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @Length(9, 9)
  UniCode: string;

  @IsString()
  @IsNotEmpty()
  FullName: string;

  @IsEmail()
  Email: string;

  @IsInt()
  @IsOptional()
  PhoneNumer?: number;

  @IsString()
  @IsNotEmpty()
  Career: string;

  @IsInt()
  Semester: number;

  @IsEnum(ActivityState)
  @IsOptional()
  Activity?: ActivityState;

  @IsEnum(AvailabilityState)
  @IsOptional()
  Disponibility?: AvailabilityState;
}
