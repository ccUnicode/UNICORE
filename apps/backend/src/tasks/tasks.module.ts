import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { ProjectMembership } from '../projects/entities/project-membership.entity';
import { ProjectPhase } from '../projects/entities/project-phase.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskAssignee } from './entities/task-assignee.entity';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    AccessControlModule,
    TypeOrmModule.forFeature([
      Task,
      TaskAssignee,
      Project,
      ProjectPhase,
      ProjectMembership,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
