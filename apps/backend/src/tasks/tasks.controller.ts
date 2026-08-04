import {
  Body,
  Controller,
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
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { SetTaskAssigneesDto } from './dto/set-task-assignees.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

const TASK_ROLES = [
  AreaRole.PRESIDENCIA,
  AreaRole.DIRECTIVA_DE_AREA,
  AreaRole.MIEMBRO,
];

@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(...TASK_ROLES)
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.create(createTaskDto, accessActor);
  }

  @Get()
  @Roles(...TASK_ROLES)
  findAll(
    @Query() filterDto: GetTasksFilterDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.findAll(filterDto, accessActor);
  }

  @Get(':id')
  @Roles(...TASK_ROLES)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.findOne(id, accessActor);
  }

  @Post(':id/comments')
  @Roles(...TASK_ROLES)
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.addComment(id, createTaskCommentDto, accessActor);
  }

  @Get(':id/comments')
  @Roles(...TASK_ROLES)
  findComments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.findComments(id, accessActor);
  }

  @Get(':id/status-history')
  @Roles(...TASK_ROLES)
  findStatusHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.findStatusHistory(id, accessActor);
  }

  @Patch(':id/status')
  @Roles(...TASK_ROLES)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.updateStatus(id, updateTaskStatusDto, accessActor);
  }

  @Patch(':id/assignees')
  @Roles(...TASK_ROLES)
  setAssignees(
    @Param('id', ParseIntPipe) id: number,
    @Body() setTaskAssigneesDto: SetTaskAssigneesDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.setAssignees(id, setTaskAssigneesDto, accessActor);
  }

  @Patch(':id')
  @Roles(...TASK_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.tasksService.update(id, updateTaskDto, accessActor);
  }
}
