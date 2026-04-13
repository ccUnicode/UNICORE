import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Skill } from '../skills/skill.entity';

@Module({
  imports: [AccessControlModule, TypeOrmModule.forFeature([Member, Skill])],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
