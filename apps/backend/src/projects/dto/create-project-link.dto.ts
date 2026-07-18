import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectLinkDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trimString)
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url: string;
}
