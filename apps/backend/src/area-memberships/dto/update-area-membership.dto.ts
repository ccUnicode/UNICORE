import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AreaRole } from '../../common/enums/area-role.enum';

export class UpdateAreaMembershipDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  areaId?: number;

  @IsEnum(AreaRole)
  @IsOptional()
  role?: AreaRole;
}
