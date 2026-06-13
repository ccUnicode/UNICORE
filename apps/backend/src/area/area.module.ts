import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';
import { Area } from './entities/area.entity';

@Module({
  imports: [AccessControlModule, TypeOrmModule.forFeature([Area])],
  controllers: [AreaController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}
