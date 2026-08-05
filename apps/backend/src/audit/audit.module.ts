import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/member.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEvent } from './entities/audit-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent, Member])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
