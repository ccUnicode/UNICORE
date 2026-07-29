import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '../../common/enums/project-role.enum';

export class AddProjectMemberDto {
  @IsInt()
  @IsNotEmpty()
  memberId: number;

  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}
