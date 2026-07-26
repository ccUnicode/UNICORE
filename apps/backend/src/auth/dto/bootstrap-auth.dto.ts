import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateMemberDto } from '../../members/dto/create-member.dto';
import { SetPasswordDto } from './set-password.dto';

export class BootstrapAuthDto extends SetPasswordDto {
  @IsString()
  @MinLength(32)
  bootstrapSecret: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMemberDto)
  member?: CreateMemberDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberId?: number;
}
