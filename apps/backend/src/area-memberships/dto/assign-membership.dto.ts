import { IsEnum, IsUUID } from 'class-validator';
import { AreaRole } from '../../common/enums/area-role.enum';

export class AssignMembershipDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  areaId: string;

  @IsEnum(AreaRole)
  role: AreaRole;
}
