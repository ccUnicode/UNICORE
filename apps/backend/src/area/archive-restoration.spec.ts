import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AreaController } from './area.controller';
import { AreaService } from './area.service';
import { ProjectsController } from '../projects/projects.controller';
import { ProjectsService } from '../projects/projects.service';
import { AreaRole } from '../common/enums/area-role.enum';
import { AccessControlledRequest } from '../common/interfaces/access-controlled-request.interface';

describe('Restoration HTTP authorization', () => {
  let app: INestApplication<App>;
  let role: AreaRole;
  const restore = jest.fn().mockResolvedValue({ id: 1, isArchived: false });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AreaController, ProjectsController],
      providers: [
        { provide: AreaService, useValue: { restore } },
        { provide: ProjectsService, useValue: { restore } },
        {
          provide: DataSource,
          useValue: {
            getRepository: () => ({
              findOne: () => Promise.resolve({ id: 1 }),
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    // Authentication is outside this harness; exercise the real RolesGuard.
    app.use((req: AccessControlledRequest, _res: unknown, next: () => void) => {
      req.accessActor = { role, memberId: '1' };
      next();
    });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    restore.mockClear();
  });

  it.each(['/areas/1/restore', '/projects/1/restore'])(
    'allows Presidencia on %s',
    async (path) => {
      role = AreaRole.PRESIDENCIA;
      await request(app.getHttpServer())
        .patch(path)
        .expect(200)
        .expect({ id: 1, isArchived: false });
      expect(restore).toHaveBeenCalledWith(1, { role, memberId: '1' });
    },
  );

  it.each([
    [AreaRole.DIRECTIVA_DE_AREA, '/areas/1/restore'],
    [AreaRole.MIEMBRO, '/areas/1/restore'],
    [AreaRole.DIRECTIVA_DE_AREA, '/projects/1/restore'],
    [AreaRole.MIEMBRO, '/projects/1/restore'],
  ])('rejects %s on %s', async (actorRole, path) => {
    role = actorRole;
    await request(app.getHttpServer()).patch(path).expect(403);
    expect(restore).not.toHaveBeenCalled();
  });
});
