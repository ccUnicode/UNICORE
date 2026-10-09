import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  databaseOptions,
  databaseMigrations,
} from '../src/database/database-options';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL is required for migration integration tests',
  );

// Each scenario has its own database; never reset the supplied database.
describe('production database startup (PostgreSQL)', () => {
  let admin: DataSource;
  const databases: string[] = [];
  const connections: DataSource[] = [];
  const originalEnv = { ...process.env };
  const entities = [join(__dirname, '../src/**/*.entity.ts')];

  async function createDatabase(): Promise<string> {
    const name = 'unicore_migration_' + Date.now() + '_' + databases.length;
    await admin.query('CREATE DATABASE "' + name + '"');
    databases.push(name);
    const url = new URL(databaseUrl!);
    url.pathname = '/' + name;
    return url.toString();
  }
  async function connect(
    url: string,
    synchronize = false,
  ): Promise<DataSource> {
    const config = new ConfigService({
      NODE_ENV: 'production',
      DATABASE_URL: url,
      DATABASE_SSL: 'false',
    });
    const ds = new DataSource({
      ...databaseOptions(config),
      entities,
      synchronize,
      migrationsRun: !synchronize,
    });
    connections.push(ds);
    await ds.initialize();
    return ds;
  }
  async function expectNoDrift(ds: DataSource): Promise<void> {
    const sql = await ds.driver.createSchemaBuilder().log();
    expect(sql.upQueries.map((query) => query.query)).toEqual([]);
  }
  beforeAll(async () => {
    admin = new DataSource({ type: 'postgres', url: databaseUrl });
    await admin.initialize();
  });
  afterAll(async () => {
    process.env = originalEnv;
    for (const ds of connections) if (ds.isInitialized) await ds.destroy();
    for (const name of databases)
      await admin.query('DROP DATABASE "' + name + '"');
    if (admin?.isInitialized) await admin.destroy();
  });

  it('starts the real application on an empty database without synchronization and restarts without changes', async () => {
    const url = await createDatabase();
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = url;
    process.env.DATABASE_SSL = 'false';
    process.env.AUTH_JWT_SECRET =
      'migration-test-jwt-secret-at-least-32-characters';
    process.env.AUTH_BOOTSTRAP_SECRET =
      'migration-test-bootstrap-secret-at-least-32-characters';
    for (let attempt = 0; attempt < 2; attempt++) {
      const app = await NestFactory.create(AppModule, {
        logger: false,
        abortOnError: false,
      });
      try {
        await app.listen(0, '127.0.0.1');
        const response = await fetch(await app.getUrl());
        expect(response.status).toBe(200);
        const ds = app.get(DataSource);
        expect(ds.options.synchronize).toBe(false);
        const history = await ds.query<{ name: string }[]>(
          'SELECT name FROM migrations ORDER BY timestamp',
        );
        expect(history.map((row) => row.name)).toEqual(
          databaseMigrations.map((migration) => migration.name),
        );
        await expectNoDrift(ds);
      } finally {
        await app.close();
      }
    }
  });

  it('upgrades a synchronized installation without losing member/skill associations', async () => {
    const url = await createDatabase();
    const legacy = await connect(url, true);
    // Old entities did not declare these migration-owned objects, so synchronize removed them.
    for (const index of ['area_id', 'actor_id', 'entity', 'timestamp']) {
      await legacy.query('DROP INDEX "IDX_audit_events_' + index + '"');
    }
    await legacy.query(
      'ALTER TABLE members DROP CONSTRAINT chk_members_disabled_snapshot',
    );
    // Recreate the normalized-column constraints from the previous synchronized entities.
    await legacy.query('DROP INDEX "IDX_skills_normalized_name"');
    await legacy.query('DROP INDEX "IDX_project_labels_normalized_name"');
    await legacy.query(
      'ALTER TABLE skills ADD CONSTRAINT "UQ_31bde3219e61eb19bc183b2a006" UNIQUE (normalized_name)',
    );
    await legacy.query(
      'ALTER TABLE project_labels ADD CONSTRAINT "UQ_28436983a02723256a6c833ec53" UNIQUE (normalized_name)',
    );
    await legacy.query(`INSERT INTO members (student_code, first_names, last_names, major, birth_date)
      VALUES ('migration-test', 'Test', 'Member', 'Systems', '2000-01-01')`);
    await legacy.query(
      `INSERT INTO skills (name, normalized_name) VALUES ('Gestión', 'gestión'), ('gestion', 'gestion')`,
    );
    await legacy.query(
      'INSERT INTO members_skills_skills ("membersId", "skillsId") VALUES (1, 1), (1, 2)',
    );
    // Existing installations have already run migrations 0000 through 0006.
    await legacy.query(
      'CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)',
    );
    for (const migration of databaseMigrations.filter((m) =>
      /178778880000[0-6]$/.test(m.name),
    )) {
      await legacy.query(
        'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
        [Number(migration.name.slice(-13)), migration.name],
      );
    }
    await legacy.destroy();
    const upgraded = await connect(url);
    expect(await upgraded.query('SELECT student_code FROM members')).toEqual([
      { student_code: 'migration-test' },
    ]);
    expect(
      await upgraded.query('SELECT name, normalized_name FROM skills'),
    ).toEqual([{ name: 'Gestión', normalized_name: 'gestion' }]);
    expect(
      await upgraded.query(
        'SELECT "membersId", "skillsId" FROM members_skills_skills',
      ),
    ).toEqual([{ membersId: 1, skillsId: 1 }]);
    await expectNoDrift(upgraded);
    expect(await upgraded.runMigrations()).toEqual([]);
  });

  it('detects a missing schema change instead of silently synchronizing it', async () => {
    const ds = await connect(await createDatabase());
    await ds.query('ALTER TABLE members DROP COLUMN cycle');
    const drift = await ds.driver.createSchemaBuilder().log();
    expect(
      drift.upQueries.some((query) => query.query.includes('ADD "cycle"')),
    ).toBe(true);
  });

  it('adopts installations that already applied normalization before synchronization', async () => {
    const url = await createDatabase();
    const legacy = await connect(url, true);
    await legacy.query('DROP INDEX "IDX_skills_normalized_name"');
    await legacy.query('DROP INDEX "IDX_project_labels_normalized_name"');
    await legacy.query(
      'ALTER TABLE skills ADD CONSTRAINT "UQ_31bde3219e61eb19bc183b2a006" UNIQUE (normalized_name)',
    );
    await legacy.query(
      'ALTER TABLE project_labels ADD CONSTRAINT "UQ_28436983a02723256a6c833ec53" UNIQUE (normalized_name)',
    );
    await legacy.query(
      "INSERT INTO skills (name, normalized_name) VALUES ('Gestión', 'gestion')",
    );
    await legacy.query(
      'CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)',
    );
    for (const migration of databaseMigrations.filter((m) =>
      /178778880000[0-7]$/.test(m.name),
    )) {
      await legacy.query(
        'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
        [Number(migration.name.slice(-13)), migration.name],
      );
    }
    await legacy.destroy();
    const upgraded = await connect(url);
    expect(
      await upgraded.query('SELECT name, normalized_name FROM skills'),
    ).toEqual([{ name: 'Gestión', normalized_name: 'gestion' }]);
    await expectNoDrift(upgraded);
  });
});
