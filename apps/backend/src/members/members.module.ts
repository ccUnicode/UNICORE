import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { AccessControlModule } from '../common/access-control.module';
import { Skill } from '../skills/skill.entity';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AccessControlModule,
    TypeOrmModule.forFeature([Member, Skill, Area, AreaMembership]),
    AuditModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
