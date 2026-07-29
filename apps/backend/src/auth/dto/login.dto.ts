import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 20)
  studentCode: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}
