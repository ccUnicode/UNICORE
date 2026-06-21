import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaModule } from '../area/area.module';
import { Member } from '../members/member.entity';
import { Project } from './entities/project.entity';
import { ProjectMembership } from './entities/project-membership.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    AreaModule,
    TypeOrmModule.forFeature([Project, ProjectMembership, Member]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
