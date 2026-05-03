import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { AreaRole } from '../entities/area-membership.entity';

export class CreateAreaMembershipDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  memberId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  areaId: number;

  @IsEnum(AreaRole)
  @IsNotEmpty()
  role: AreaRole;
}
