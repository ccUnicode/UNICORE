import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  Length,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AreaRole } from '../../common/enums/area-role.enum';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeInstitution = ({ value }: { value: unknown }) => {
  if (value === undefined) {
    return 'UNI';
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized === '' ? '' : normalized.toUpperCase();
};

const trimSkills = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((item) => item.length > 0);
};

@ValidatorConstraint({ name: 'ValidMemberAreaAssignment', async: false })
class ValidMemberAreaAssignment implements ValidatorConstraintInterface {
  validate(areaId: unknown, args: ValidationArguments): boolean {
    const member = args.object as CreateMemberDto;

    if (member.role === AreaRole.DIRECTIVA_DE_AREA) {
      return Number.isInteger(areaId) && Number(areaId) > 0;
    }

    return areaId === undefined;
  }

  defaultMessage(args: ValidationArguments): string {
    const member = args.object as CreateMemberDto;

    if (member.role === AreaRole.DIRECTIVA_DE_AREA) {
      return 'areaId is required for directiva_de_area members';
    }

    return 'areaId is only allowed for directiva_de_area members';
  }
}

export class CreateMemberDto {
  @Transform(normalizeInstitution)
  @IsString()
  @Length(1, 120)
  institution: string = 'UNI';

  @Transform(trimString)
  @ValidateIf(
    (member: CreateMemberDto) =>
      member.institution === 'UNI' || member.studentCode !== undefined,
  )
  @IsString()
  @Length(1, 20)
  studentCode?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  firstNames: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  lastNames: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  major: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(AreaRole)
  role: AreaRole = AreaRole.MIEMBRO;

  @Type(() => Number)
  @Validate(ValidMemberAreaAssignment)
  areaId?: number;

  @Transform(trimSkills)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills: string[];
}
