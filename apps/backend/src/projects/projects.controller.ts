import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  findAll(
    @CurrentAccessActor() accessActor: RequestAccessActor,
    @Query() filterDto: GetProjectsFilterDto,
  ) {
    return this.projectsService.findAll(filterDto, accessActor);
  }

  @Get(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Patch(':id/archive')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.archive(id);
  }

  @Get(':projectId/phases')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  findPhases(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.findPhases(projectId);
  }

  @Post(':projectId/phases')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  createPhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createProjectPhaseDto: CreateProjectPhaseDto,
  ) {
    return this.projectsService.createPhase(projectId, createProjectPhaseDto);
  }

  @Patch(':projectId/phases/reorder')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  reorderPhases(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() reorderProjectPhasesDto: ReorderProjectPhasesDto,
  ) {
    return this.projectsService.reorderPhases(
      projectId,
      reorderProjectPhasesDto,
    );
  }

  @Patch(':projectId/phases/:phaseId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  updatePhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() updateProjectPhaseDto: UpdateProjectPhaseDto,
  ) {
    return this.projectsService.updatePhase(
      projectId,
      phaseId,
      updateProjectPhaseDto,
    );
  }

  @Delete(':projectId/phases/:phaseId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  deletePhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
  ) {
    return this.projectsService.deletePhase(projectId, phaseId);
  }
}
