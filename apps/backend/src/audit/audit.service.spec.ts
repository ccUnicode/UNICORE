/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { Member } from '../members/member.entity';
import { AuditService } from './audit.service';
import { AuditEvent } from './entities/audit-event.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditRepo: jest.Mocked<Repository<AuditEvent>>;
  let memberRepo: jest.Mocked<Repository<Member>>;

  beforeEach(async () => {
    const mockAuditRepo = {
      create: jest.fn(
        (dto: Partial<AuditEvent>): AuditEvent => dto as AuditEvent,
      ),
      save: jest.fn((event: Partial<AuditEvent>) =>
        Promise.resolve({ id: 1, ...event } as AuditEvent),
      ),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const mockMemberRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: mockAuditRepo,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: mockMemberRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditRepo = module.get(getRepositoryToken(AuditEvent));
    memberRepo = module.get(getRepositoryToken(Member));
  });

  describe('record', () => {
    const actor: RequestAccessActor = {
      role: AreaRole.PRESIDENCIA,
      memberId: '5',
    };

    it('records an audit event with immutable actor full name', async () => {
      memberRepo.findOne.mockResolvedValue({
        id: 5,
        firstNames: 'Carlos',
        lastNames: 'Pérez',
      } as Member);

      await service.record(actor, {
        action: 'create',
        entityType: 'Area',
        entityId: 10,
        areaId: 10,
        metadata: { name: 'Sistemas' },
      });

      expect(memberRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        select: ['id', 'firstNames', 'lastNames'],
      });
      expect(auditRepo.create).toHaveBeenCalledWith({
        actorId: 5,
        actorName: 'Carlos Pérez',
        actorRole: AreaRole.PRESIDENCIA,
        action: 'create',
        entityType: 'Area',
        entityId: '10',
        areaId: 10,
        metadata: JSON.stringify({ name: 'Sistemas' }),
      });
      expect(auditRepo.save).toHaveBeenCalled();
    });

    it('skips recording if memberId is missing or invalid', async () => {
      await service.record(
        { role: AreaRole.PRESIDENCIA, memberId: undefined },
        { action: 'create', entityType: 'Area', entityId: 1 },
      );

      expect(auditRepo.save).not.toHaveBeenCalled();
    });

    it('handles repository errors silently without throwing', async () => {
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
      memberRepo.findOne.mockRejectedValue(new Error('DB failure'));

      await expect(
        service.record(actor, {
          action: 'create',
          entityType: 'Area',
          entityId: 1,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    const presidencyActor: RequestAccessActor = {
      role: AreaRole.PRESIDENCIA,
      memberId: '1',
    };

    const areaDirectivaActor: RequestAccessActor = {
      role: AreaRole.DIRECTIVA_DE_AREA,
      areaId: '2',
      memberId: '3',
    };

    const memberActor: RequestAccessActor = {
      role: AreaRole.MIEMBRO,
      memberId: '4',
    };

    it('rejects member role with ForbiddenException', async () => {
      await expect(service.findAll({}, memberActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('scopes query to areaId for Directiva de Área role', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, areaDirectivaActor);

      expect(auditRepo.findAndCount).toHaveBeenCalledWith({
        where: { areaId: 2 },
        order: { timestamp: 'DESC', id: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('applies action, entityType (case-insensitive) and pagination filters', async () => {
      auditRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 1,
            action: 'create',
            entityType: 'Project',
            entityId: '100',
          } as AuditEvent,
        ],
        1,
      ]);

      const result = await service.findAll(
        {
          page: 2,
          limit: 5,
          action: 'create',
          entityType: 'project',
        },
        presidencyActor,
      );

      expect(auditRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          action: 'create',
          entityType: ILike('project'),
        },
        order: { timestamp: 'DESC', id: 'DESC' },
        skip: 5,
        take: 5,
      });

      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        lastPage: 1,
      });
    });

    it('throws BadRequestException if dateFrom is after dateTo', async () => {
      await expect(
        service.findAll(
          {
            dateFrom: '2026-08-10',
            dateTo: '2026-08-01',
          },
          presidencyActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies dateFrom and dateTo range filter covering full end day', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {
          dateFrom: '2026-08-01',
          dateTo: '2026-08-05',
        },
        presidencyActor,
      );

      const start = new Date('2026-08-01');
      const end = new Date('2026-08-05');
      end.setUTCHours(23, 59, 59, 999);

      expect(auditRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          timestamp: Between(start, end),
        },
        order: { timestamp: 'DESC', id: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });
});
