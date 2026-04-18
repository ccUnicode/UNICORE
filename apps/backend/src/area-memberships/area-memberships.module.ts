import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaMembershipsService } from './area-memberships.service';
import { AreaMembershipsController } from './area-memberships.controller';
import { AreaMembership } from './entities/area-membership.entity';
import { Member } from '../members/member.entity';
import { Area } from '../area/entities/area.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AreaMembership, Member, Area])],
  controllers: [AreaMembershipsController],
  providers: [AreaMembershipsService],
  exports: [AreaMembershipsService],
})
export class AreaMembershipsModule {}
