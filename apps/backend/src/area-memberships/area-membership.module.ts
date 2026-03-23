import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaMembership } from './area-membership.entity';
import { AreaMembershipService } from './area-membership.service';
import { AreaMembershipController } from './area-membership.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AreaMembership])],
  controllers: [AreaMembershipController],
  providers: [AreaMembershipService],
  exports: [AreaMembershipService],
})
export class AreaMembershipModule {}
