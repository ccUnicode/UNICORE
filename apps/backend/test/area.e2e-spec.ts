import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from './../src/area/entities/area.entity';

describe('AreaController (e2e)', () => {
  let app: INestApplication;

  const mockAreaRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((area) => Promise.resolve({ id: 1, ...area })),
    find: jest.fn().mockResolvedValue([{ id: 1, name: 'Test Area' }]),
    findOne: jest.fn().mockImplementation(({ where: { id } }) => {
      if (id === 1) return Promise.resolve({ id: 1, name: 'Test Area', isArchived: false });
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Area))
      .useValue(mockAreaRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/areas (POST) - should create an area', () => {
    return request(app.getHttpServer())
      .post('/areas')
      .send({ name: 'New E2E Area' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual({
          id: 1,
          name: 'New E2E Area',
        });
      });
  });

  it('/areas (GET) - should return all areas', () => {
    return request(app.getHttpServer())
      .get('/areas')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBe(1);
        expect(res.body[0].name).toBe('Test Area');
      });
  });

  it('/areas/:id (GET) - should return a single area', () => {
    return request(app.getHttpServer())
      .get('/areas/1')
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(1);
        expect(res.body.name).toBe('Test Area');
      });
  });

  it('/areas/:id (GET) - should return 404 if area not found', () => {
    return request(app.getHttpServer())
      .get('/areas/999')
      .expect(404);
  });

  it('/areas/:id (PATCH) - should update an area', () => {
    return request(app.getHttpServer())
      .patch('/areas/1')
      .send({ name: 'Updated Area' })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Updated Area');
      });
  });

  it('/areas/:id/archive (PATCH) - should archive an area', () => {
    return request(app.getHttpServer())
      .patch('/areas/1/archive')
      .expect(200)
      .expect((res) => {
        expect(res.body.isArchived).toBe(true);
      });
  });
});
