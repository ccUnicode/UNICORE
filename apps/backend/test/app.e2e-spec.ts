import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

type CreateMemberPayload = {
  institution?: string;
  studentCode?: string;
  firstNames: string;
  lastNames: string;
  major: string;
  birthDate: string;
  skills: string[];
};

type MemberResponse = {
  id: number;
  institution: string;
  studentCode: string | null;
  firstNames: string;
  lastNames: string;
  major: string;
  birthDate: string;
  skills: string[];
  createdAt: string;
  updatedAt: string;
};

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let sequence = 0;

  const getApp = (): INestApplication<App> => {
    if (!app) {
      throw new Error('Application not initialized');
    }

    return app;
  };

  const nextSuffix = () => {
    sequence += 1;
    return `${Date.now()}-${sequence}`;
  };

  const createMemberPayload = (
    overrides: Partial<CreateMemberPayload> = {},
  ): CreateMemberPayload => {
    const suffix = nextSuffix();

    return {
      studentCode: `SC-${suffix}`,
      firstNames: `Member${suffix}`,
      lastNames: 'Testing',
      major: 'Software Engineering',
      birthDate: '2004-04-18',
      skills: ['TypeScript', 'Testing'],
      ...overrides,
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(getApp().getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('creates a UNI member when institution is omitted', async () => {
    const response = await request(getApp().getHttpServer())
      .post('/members')
      .send(createMemberPayload())
      .expect(201);

    const body = response.body as MemberResponse;

    expect(body.institution).toBe('UNI');
    expect(body.studentCode).toMatch(/^SC-/);
  });

  it('normalizes institution before persisting the member', async () => {
    const response = await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: '  uni  ',
        }),
      )
      .expect(201);

    const body = response.body as MemberResponse;

    expect(body.institution).toBe('UNI');
  });

  it('creates an external member without student code', async () => {
    const response = await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'PUCP',
          studentCode: undefined,
        }),
      )
      .expect(201);

    const body = response.body as MemberResponse;

    expect(body.institution).toBe('PUCP');
    expect(body.studentCode).toBeNull();
  });

  it('rejects UNI members without student code', async () => {
    await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'UNI',
          studentCode: undefined,
        }),
      )
      .expect(400);
  });

  it('rejects institutions that are empty after trimming', async () => {
    await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: '   ',
        }),
      )
      .expect(400);
  });

  it('rejects duplicated student code within the same institution', async () => {
    const studentCode = `SC-${nextSuffix()}`;
    const payload = createMemberPayload({
      institution: 'UNI',
      studentCode,
    });

    await request(getApp().getHttpServer())
      .post('/members')
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(getApp().getHttpServer())
      .post('/members')
      .send({
        ...createMemberPayload({
          institution: 'UNI',
          studentCode,
        }),
        studentCode,
      })
      .expect(409);

    const body = duplicateResponse.body as ErrorResponse;

    expect(body.message).toBe(
      `A member with institution "UNI" and student code "${studentCode}" already exists.`,
    );
  });

  it('allows the same student code in different institutions', async () => {
    const studentCode = `SC-${nextSuffix()}`;

    await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'PUCP',
          studentCode,
        }),
      )
      .expect(201);

    const secondResponse = await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'ULIMA',
          studentCode,
        }),
      )
      .expect(201);

    const body = secondResponse.body as MemberResponse;

    expect(body.institution).toBe('ULIMA');
    expect(body.studentCode).toBe(studentCode);
  });

  it('allows multiple external members without student code', async () => {
    await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'PUCP',
          studentCode: undefined,
        }),
      )
      .expect(201);

    const secondResponse = await request(getApp().getHttpServer())
      .post('/members')
      .send(
        createMemberPayload({
          institution: 'PUCP',
          studentCode: undefined,
        }),
      )
      .expect(201);

    const body = secondResponse.body as MemberResponse;

    expect(body.institution).toBe('PUCP');
    expect(body.studentCode).toBeNull();
  });
});
