import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MembersService } from './members.service';
import { User } from './entities/members.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [MemberController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MemberModule {}
