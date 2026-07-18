import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectPhaseDto } from './create-project-phase.dto';

export class UpdateProjectPhaseDto extends PartialType(CreateProjectPhaseDto) {}
