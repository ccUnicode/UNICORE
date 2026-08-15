import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { cleanText } from '../../common/utils/text-normalization.util';

const normalizeSkill = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  return cleanText(value);
};

export class CreateSkillDto {
  @Transform(normalizeSkill)
  @IsString()
  @Length(1, 120)
  name: string;
}
