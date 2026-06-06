import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Skill } from '../skills/skill.entity';
import { Area } from '../area/entities/area.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Member, Skill, Area])],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
