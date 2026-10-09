import { join } from 'node:path';
import { DataSource } from 'typeorm';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  const envPath = join(__dirname, '../../.env');
  return {
    ...actual,
    existsSync: (path: string) => path === envPath || actual.existsSync(path),
    readFileSync: (path: string, ...args: unknown[]) =>
      path === envPath
        ? 'DATABASE_URL=postgresql://fixture:fixture@localhost/env_fixture\nDATABASE_SSL=false\n'
        : (actual.readFileSync as (...args: unknown[]) => unknown)(
            path,
            ...args,
          ),
  };
});

describe('migration CLI configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads the backend .env without initializing the application', () => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_SSL;
    jest.isolateModules(() => {
      const ds = jest.requireActual<{ default: DataSource }>(
        './data-source',
      ).default;
      expect(ds.options).toMatchObject({
        url: 'postgresql://fixture:fixture@localhost/env_fixture',
        ssl: false,
        synchronize: false,
        migrationsRun: false,
      });
      expect(ds.isInitialized).toBe(false);
    });
  });

  it('gives injected environment variables precedence over .env', () => {
    process.env.DATABASE_URL =
      'postgresql://fixture:fixture@localhost/injected';
    process.env.DATABASE_SSL = 'true';
    jest.isolateModules(() => {
      const ds = jest.requireActual<{ default: DataSource }>(
        './data-source',
      ).default;
      expect(ds.options).toMatchObject({
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        synchronize: false,
        migrationsRun: false,
      });
    });
  });
});
