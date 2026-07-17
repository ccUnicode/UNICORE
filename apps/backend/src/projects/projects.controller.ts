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
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectsService } from './projects.service';

// TODO: Add project permissions once the access rules are defined.
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.projectsService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Get(':projectId/phases')
  findPhases(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.findPhases(projectId);
  }

  @Post(':projectId/phases')
  createPhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createProjectPhaseDto: CreateProjectPhaseDto,
  ) {
    return this.projectsService.createPhase(projectId, createProjectPhaseDto);
  }

  @Patch(':projectId/phases/reorder')
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
  deletePhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
  ) {
    return this.projectsService.deletePhase(projectId, phaseId);
  }
}
