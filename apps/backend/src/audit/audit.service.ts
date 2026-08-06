import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { parseAreaId } from '../common/utils/parse-area-id.util';
import { Member } from '../members/member.entity';
import { GetAuditEventsFilterDto } from './dto/get-audit-events-filter.dto';
import { AuditEvent } from './entities/audit-event.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditEventsRepository: Repository<AuditEvent>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async record(
    accessActor: RequestAccessActor,
    data: {
      action: string;
      entityType: string;
      entityId: string | number;
      areaId?: number | null;
      metadata?: Record<string, any>;
    },
    entityManager?: EntityManager,
  ): Promise<void> {
    const actorId = Number(accessActor.memberId);
    if (!Number.isSafeInteger(actorId) || actorId < 1) {
      return; // Skip system/anonymous actions
    }

    const memberRepo = entityManager
      ? entityManager.getRepository(Member)
      : this.membersRepository;

    const auditRepo = entityManager
      ? entityManager.getRepository(AuditEvent)
      : this.auditEventsRepository;

    // Retrieve actor name to keep audit log immutable
    const actorMember = await memberRepo.findOne({
      where: { id: actorId },
      select: ['id', 'firstNames', 'lastNames'],
    });

    const actorName = actorMember
      ? `${actorMember.firstNames} ${actorMember.lastNames}`
      : 'Unknown';

    const event = auditRepo.create({
      actorId,
      actorName,
      actorRole: accessActor.role,
      action: data.action,
      entityType: data.entityType,
      entityId: String(data.entityId),
      areaId: data.areaId ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });

    await auditRepo.save(event);
  }

  async findAll(
    filterDto: GetAuditEventsFilterDto,
    accessActor: RequestAccessActor,
  ): Promise<PaginatedResponse<AuditEvent>> {
    if (accessActor.role === AreaRole.MIEMBRO) {
      throw new ForbiddenException('Members cannot access the audit screen');
    }

    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditEvent> = {};

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      const areaId = parseAreaId(accessActor.areaId);
      where.areaId = areaId;
    }

    if (filterDto.actorId !== undefined) {
      where.actorId = filterDto.actorId;
    }

    if (filterDto.action) {
      where.action = filterDto.action;
    }

    if (filterDto.entityType) {
      where.entityType = ILike(filterDto.entityType);
    }

    if (filterDto.dateFrom && filterDto.dateTo) {
      // Set to beginning of start day and end of end day to cover full range
      const start = new Date(filterDto.dateFrom);
      const end = new Date(filterDto.dateTo);
      where.timestamp = Between(start, end);
    } else if (filterDto.dateFrom) {
      where.timestamp = MoreThanOrEqual(new Date(filterDto.dateFrom));
    } else if (filterDto.dateTo) {
      where.timestamp = LessThanOrEqual(new Date(filterDto.dateTo));
    }

    const [data, total] = await this.auditEventsRepository.findAndCount({
      where,
      order: { timestamp: 'DESC', id: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
