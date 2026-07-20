import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaModule } from '../area/area.module';
import { ProjectLabel } from './entities/project-label.entity';
import { ProjectLink } from './entities/project-link.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    AreaModule,
    TypeOrmModule.forFeature([
      Project,
      ProjectPhase,
      ProjectLabel,
      ProjectLink,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
