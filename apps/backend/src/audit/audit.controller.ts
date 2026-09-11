import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { AuditService } from './audit.service';
import { GetAuditEventsFilterDto } from './dto/get-audit-events-filter.dto';
import { AuditEvent } from './entities/audit-event.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@ApiBearerAuth('bearer')
@Controller('audit')
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  findAll(
    @Query() filterDto: GetAuditEventsFilterDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ): Promise<PaginatedResponse<AuditEvent>> {
    return this.auditService.findAll(filterDto, accessActor);
  }
}
