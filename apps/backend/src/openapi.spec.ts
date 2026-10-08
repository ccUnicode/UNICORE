import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { configureOpenApi, OPENAPI_PATH } from './openapi';

describe('configureOpenApi', () => {
  it('publishes the generated contract and JSON document', () => {
    const app = {} as INestApplication;
    const document = { openapi: '3.0.0', info: {}, paths: {} };
    const createDocument = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    configureOpenApi(app);

    expect(createDocument).toHaveBeenCalledWith(app, expect.any(Object));
    expect(setup).toHaveBeenCalledWith(OPENAPI_PATH, app, document, {
      jsonDocumentUrl: `${OPENAPI_PATH}-json`,
      swaggerOptions: { persistAuthorization: true },
    });
  });
});
