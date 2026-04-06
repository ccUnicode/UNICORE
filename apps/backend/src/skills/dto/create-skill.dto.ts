import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const normalizeSkill = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
};

export class CreateSkillDto {
  @Transform(normalizeSkill)
  @IsString()
  @Length(1, 120)
  name: string;
}
