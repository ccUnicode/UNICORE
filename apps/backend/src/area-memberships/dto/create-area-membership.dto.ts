import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { AreaRole } from '../../common/enums/area-role.enum';

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
