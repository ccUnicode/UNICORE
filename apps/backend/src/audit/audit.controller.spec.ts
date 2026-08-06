/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEvent } from './entities/audit-event.entity';

describe('AuditController', () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockAuditService = {
      findAll: jest.fn(),
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: DataSource,
          useValue: {},
        },
        RolesGuard,
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get(AuditService);
  });

  it('delegates audit logs query to auditService.findAll', async () => {
    const expectedResult = {
      data: [
        {
          id: 1,
          actorId: 5,
          actorName: 'Juan Pérez',
          actorRole: AreaRole.PRESIDENCIA,
          action: 'create',
          entityType: 'Area',
          entityId: '10',
          areaId: 10,
          timestamp: new Date(),
          metadata: null,
        } as AuditEvent,
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        lastPage: 1,
      },
    };

    const actor: RequestAccessActor = {
      role: AreaRole.PRESIDENCIA,
      memberId: '5',
    };

    const filterDto = { page: 1, limit: 10, action: 'create' };
    service.findAll.mockResolvedValue(expectedResult);

    const result = await controller.findAll(filterDto, actor);

    expect(result).toEqual(expectedResult);
    expect(service.findAll).toHaveBeenCalledWith(filterDto, actor);
  });
});
