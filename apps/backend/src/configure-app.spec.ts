import {
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  Body,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IsInt } from 'class-validator';
import request from 'supertest';
import { Server } from 'node:http';
import { configureApp } from './configure-app';

class Payload {
  @IsInt()
  count: number;
}

@Controller()
class TestController {
  @Get()
  get() {
    return { ok: true };
  }

  @Post()
  post(@Body() body: Payload) {
    return body;
  }
}

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  controllers: [TestController],
})
class TestModule {}

describe('shared HTTP configuration', () => {
  // Booting Nest and serving HTTP can exceed the unit default on cold CI workers.
  jest.setTimeout(15000);
  let app: INestApplication;
  const originalOrigin = process.env.CORS_ORIGIN;

  afterEach(async () => {
    await app?.close();
    if (originalOrigin === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = originalOrigin;
  });

  async function start(origin?: string) {
    if (origin === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = origin;
    app = await NestFactory.create(TestModule, { logger: false });
    configureApp(app);
    await app.init();
    return request(app.getHttpServer() as Server);
  }

  it('preserves local CORS and strips unknown fields while converting DTO values', async () => {
    const http = await start();
    await http.get('/').expect('Access-Control-Allow-Origin', '*');
    await http
      .post('/')
      .send({ count: '2', extra: 'removed' })
      .expect(201, { count: 2 });
    await http.post('/').send({ count: 'invalid' }).expect(400);
  });

  it('restricts cross-origin access to the configured frontend, including preflight', async () => {
    const http = await start('https://frontend.example.com');
    await http
      .options('/')
      .set('Origin', 'https://frontend.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://frontend.example.com');
    // A foreign origin never receives permission to read the response.
    const response = await http
      .get('/')
      .set('Origin', 'https://foreign.example.com');
    expect(response.headers['access-control-allow-origin']).not.toBe(
      'https://foreign.example.com',
    );
  });
});
