import { ConfigService } from '@nestjs/config';
import { databaseOptions } from './database-options';

describe('database environment policy', () => {
  const originalEnvironment = process.env.NODE_ENV;
  afterEach(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });
  it.each(['production', 'test', 'staging', undefined])(
    'uses only migrations for %s',
    (environment) => {
      const config = new ConfigService({ NODE_ENV: environment });
      // Do not let the calling shell override the explicit test configuration.
      delete process.env.NODE_ENV;
      expect(databaseOptions(config)).toMatchObject({
        synchronize: false,
        migrationsRun: true,
      });
    },
  );
  it('preserves local synchronization only for explicit development', () => {
    const config = new ConfigService({ NODE_ENV: 'development' });
    delete process.env.NODE_ENV;
    expect(databaseOptions(config)).toMatchObject({
      synchronize: true,
      migrationsRun: false,
    });
  });
});
