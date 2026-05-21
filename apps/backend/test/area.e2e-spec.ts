import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from './../src/area/entities/area.entity';
import { CreateAreaDto } from './../src/area/dto/create-area.dto';
import { UpdateAreaDto } from './../src/area/dto/update-area.dto';
import {
  hasNumberProperty,
  hasOptionalBooleanProperty,
  hasOptionalStringProperty,
  hasStringProperty,
  isRecord,
  parseResponse,
  parseResponseList,
} from './utils/response-parsers';

type AreaPayload = CreateAreaDto | UpdateAreaDto | Partial<Area>;
type AreaResponse = Pick<Area, 'id' | 'name'> &
  Partial<Pick<Area, 'description' | 'isArchived'>>;
type AreaFindOneArgs = {
  where: {
    id?: unknown;
    name?: unknown;
  };
};

const getFindOperatorValue = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || !('value' in value)) {
    return value;
  }

  return (value as { value: unknown }).value;
};

const isAreaResponse = (value: unknown): value is AreaResponse => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasNumberProperty(value, 'id') &&
    hasStringProperty(value, 'name') &&
    hasOptionalStringProperty(value, 'description') &&
    hasOptionalBooleanProperty(value, 'isArchived')
  );
};

const parseAreaResponse = (body: unknown): AreaResponse =>
  parseResponse(body, isAreaResponse, 'Unexpected area response body');

const parseAreaListResponse = (body: unknown): AreaResponse[] =>
  parseResponseList(body, isAreaResponse, 'Unexpected area list response body');

describe('AreaController (e2e)', () => {
  let app: INestApplication | undefined;

  const getApp = (): INestApplication => {
    if (!app) {
      throw new Error('Application not initialized');
    }

    return app;
  };

  const getHttpServer = (): Parameters<typeof request>[0] =>
    getApp().getHttpServer() as Parameters<typeof request>[0];

  const mockAreaRepository = {
    create: jest.fn().mockImplementation((dto: AreaPayload) => dto),
    save: jest
      .fn()
      .mockImplementation((area: AreaPayload) =>
        Promise.resolve({ id: 1, ...area }),
      ),
    find: jest
      .fn()
      .mockResolvedValue([{ id: 1, name: 'Test Area', isArchived: false }]),
    findOne: jest.fn().mockImplementation(({ where }: AreaFindOneArgs) => {
      const id = getFindOperatorValue(where.id);
      const name = getFindOperatorValue(where.name);

      if (typeof name === 'string') {
        if (name.toLowerCase() === 'existing area') {
          return Promise.resolve({
            id: 2,
            name: 'Existing Area',
            isArchived: false,
          });
        }

        return Promise.resolve(null);
      }

      if (id === 1) {
        return Promise.resolve({
          id: 1,
          name: 'Test Area',
          isArchived: false,
        });
      }

      return Promise.resolve(null);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Area))
      .useValue(mockAreaRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/areas (POST) - should create an area', () => {
    return request(getHttpServer())
      .post('/areas')
      .send({ name: 'New E2E Area' })
      .expect(201)
      .expect((res: { body: unknown }) => {
        expect(parseAreaResponse(res.body)).toMatchObject({
          id: 1,
          name: 'New E2E Area',
        });
      });
  });

  it('/areas (GET) - should return all areas', () => {
    return request(getHttpServer())
      .get('/areas')
      .expect(200)
      .expect((res: { body: unknown }) => {
        const body = parseAreaListResponse(res.body);

        expect(body).toHaveLength(1);
        expect(body[0]?.name).toBe('Test Area');
      });
  });

  it('/areas/:id (GET) - should return a single area', () => {
    return request(getHttpServer())
      .get('/areas/1')
      .expect(200)
      .expect((res: { body: unknown }) => {
        const body = parseAreaResponse(res.body);

        expect(body.id).toBe(1);
        expect(body.name).toBe('Test Area');
      });
  });

  it('/areas/:id (GET) - should return 404 if area not found', () => {
    return request(getHttpServer()).get('/areas/999').expect(404);
  });

  it('/areas/:id (PATCH) - should update an area', () => {
    return request(getHttpServer())
      .patch('/areas/1')
      .send({ name: 'Updated Area' })
      .expect(200)
      .expect((res: { body: unknown }) => {
        expect(parseAreaResponse(res.body).name).toBe('Updated Area');
      });
  });

  it('/areas/:id (PATCH) - should reject duplicate area names', () => {
    return request(getHttpServer())
      .patch('/areas/1')
      .send({ name: 'Existing Area' })
      .expect(409);
  });

  it('/areas/:id/archive (PATCH) - should archive an area', () => {
    return request(getHttpServer())
      .patch('/areas/1/archive')
      .expect(200)
      .expect((res: { body: unknown }) => {
        expect(parseAreaResponse(res.body).isArchived).toBe(true);
      });
  });
});
