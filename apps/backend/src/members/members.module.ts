import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from '../area/entities/area.entity';
import { AccessControlModule } from '../common/access-control.module';
import { Skill } from '../skills/skill.entity';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [AccessControlModule, TypeOrmModule.forFeature([Member, Skill, Area])],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
