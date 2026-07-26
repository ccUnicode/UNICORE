import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AreaRole } from '../src/common/enums/area-role.enum';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ProjectStatus } from '../src/projects/enums/project-status.enum';
import { ProjectsController } from '../src/projects/projects.controller';
import { ProjectsService } from '../src/projects/projects.service';

describe('ProjectsController access (e2e)', () => {
  let app: INestApplication;

  const getHttpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    findPhases: jest.fn(),
    createPhase: jest.fn(),
    reorderPhases: jest.fn(),
    updatePhase: jest.fn(),
    deletePhase: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        RolesGuard,
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects project creation without an access actor', async () => {
    await request(getHttpServer())
      .post('/projects')
      .send({ name: 'Portal', areaId: 1 })
      .expect(403);

    expect(mockProjectsService.create).not.toHaveBeenCalled();
  });

  it('rejects project creation for members', async () => {
    await request(getHttpServer())
      .post('/projects')
      .set('x-role', AreaRole.MIEMBRO)
      .set('x-project-ids', '1')
      .send({ name: 'Portal', areaId: 1 })
      .expect(403);

    expect(mockProjectsService.create).not.toHaveBeenCalled();
  });

  it('passes area leader context to project creation', async () => {
    mockProjectsService.create.mockResolvedValue({
      id: 1,
      name: 'Portal',
      areaId: 1,
      status: ProjectStatus.PLANNED,
    });

    await request(getHttpServer())
      .post('/projects')
      .set('x-role', AreaRole.DIRECTIVA_DE_AREA)
      .set('x-area-id', '1')
      .send({ name: 'Portal', areaId: 1 })
      .expect(201);

    expect(mockProjectsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Portal', areaId: 1 }),
      {
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: '1',
        memberId: undefined,
        projectIds: undefined,
      },
    );
  });

  it('rejects project detail without an access actor', async () => {
    await request(getHttpServer()).get('/projects/1').expect(403);

    expect(mockProjectsService.findOne).not.toHaveBeenCalled();
  });
});
