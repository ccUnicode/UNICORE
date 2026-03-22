import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('debe crear un miembro', async () => {
    const randomUniCode = 'A' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0');
    const createResponse = await request(app.getHttpServer())
      .post('/members')
      .send({
        UniCode: randomUniCode,
        FullName: 'Nuevo Usuario',
        Email: 'nuevo.usuario@example.com',
        PhoneNumer: 123456789,
        Career: 'Matemáticas',
        Semester: 2,
        Activity: 'Activo',
        Disponibility: 'Disponible'
      })
      .expect(201);

    expect(createResponse.body.UniCode).toBe(randomUniCode);
    expect(createResponse.body.FullName).toBe('Nuevo Usuario');
    expect(createResponse.body.Activity).toBe('Activo');
    expect(createResponse.body.Disponibility).toBe('Disponible');
  });

  it('debe actualizar la actividad y disponibilidad de un miembro existente', async () => {
    // Primero, crea un usuario
    const randomUniCode = 'A' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0');
    const createResponse = await request(app.getHttpServer())
      .post('/members')
      .send({
        UniCode: randomUniCode,
        FullName: 'Usuario Actualizable',
        Email: 'actualizable@example.com',
        PhoneNumer: 555555555,
        Career: 'Física',
        Semester: 4,
        Activity: 'Activo',
        Disponibility: 'Disponible'
      })
      .expect(201);

    const memberId = createResponse.body.UserId;

    // Ahora, actualiza solo la actividad
    const updateActivity = await request(app.getHttpServer())
      .patch(`/members/${memberId}`)
      .send({ Activity: 'Inactivo' })
      .expect(200);
    expect(updateActivity.body.Activity).toBe('Inactivo');

    // Ahora, actualiza solo la disponibilidad
    const updateDisponibility = await request(app.getHttpServer())
      .patch(`/members/${memberId}`)
      .send({ Disponibility: 'No disponible' })
      .expect(200);
    expect(updateDisponibility.body.Disponibility).toBe('No disponible');
  });
});
