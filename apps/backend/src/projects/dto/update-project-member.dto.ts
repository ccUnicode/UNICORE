import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '../../common/enums/project-role.enum';

export class UpdateProjectMemberDto {
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}
