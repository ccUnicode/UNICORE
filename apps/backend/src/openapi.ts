import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const OPENAPI_PATH = 'api/docs';

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('UNICORE API')
    .setDescription(
      'Contrato REST de UNICORE generado desde controllers, DTOs, enums y decoradores.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(OPENAPI_PATH, app, document, {
    jsonDocumentUrl: `${OPENAPI_PATH}-json`,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
