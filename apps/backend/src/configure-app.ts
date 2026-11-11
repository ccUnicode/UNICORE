import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Apply the same HTTP policy locally and through Vercel's native NestJS entrypoint. */
export function configureApp(app: INestApplication): void {
  const origin = app.get(ConfigService).get<string>('CORS_ORIGIN')?.trim();
  app.enableCors(origin ? { origin } : undefined);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
