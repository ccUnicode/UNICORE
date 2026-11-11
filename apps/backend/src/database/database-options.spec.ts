import { ConfigService } from '@nestjs/config';
import { databaseOptions } from './database-options';
import { deploymentOptions } from './deployment-options';

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

  it('disables startup migrations and limits the runtime pool on Vercel', () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      DATABASE_MIGRATIONS_RUN: 'false',
      DATABASE_POOL_MAX: '2',
    });
    expect(databaseOptions(config)).toMatchObject({
      synchronize: false,
      migrationsRun: false,
      extra: { max: 2 },
    });
  });

  it('allows explicit migration startup while leaving the default pool untouched', () => {
    expect(
      databaseOptions(new ConfigService({ DATABASE_MIGRATIONS_RUN: 'true' })),
    ).toMatchObject({ migrationsRun: true });
    expect(databaseOptions(new ConfigService()).extra).toBeUndefined();
  });

  it.each(['', 'yes', '0'])('rejects invalid migration policy %j', (value) => {
    expect(() =>
      databaseOptions(new ConfigService({ DATABASE_MIGRATIONS_RUN: value })),
    ).toThrow('DATABASE_MIGRATIONS_RUN must be true or false');
  });

  it.each(['', '0', '-1', '1.5', '2connections', '9007199254740992'])(
    'rejects invalid pool size %j',
    (value) => {
      expect(() =>
        databaseOptions(new ConfigService({ DATABASE_POOL_MAX: value })),
      ).toThrow('DATABASE_POOL_MAX must be a positive integer');
    },
  );

  it('deploys through the direct URL without synchronizing or implicit migrations', () => {
    const options = deploymentOptions(
      new ConfigService({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://runtime-pooler/test',
        DATABASE_URL_UNPOOLED: 'postgresql://direct/test',
        DATABASE_MIGRATIONS_RUN: 'true',
      }),
    );
    expect(options).toMatchObject({
      url: 'postgresql://direct/test',
      synchronize: false,
      migrationsRun: false,
    });
  });

  it('fails deployment without the direct URL instead of using the runtime URL', () => {
    expect(() =>
      deploymentOptions(
        new ConfigService({ DATABASE_URL: 'postgresql://runtime-pooler/test' }),
      ),
    ).toThrow('DATABASE_URL_UNPOOLED is required');
  });
});
