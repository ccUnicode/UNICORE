import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  /** Allocate an isolated database and register it for cleanup after the suite. */
  async function createDatabase(): Promise<string> {
    const name = 'unicore_migration_' + Date.now() + '_' + databases.length;
    await admin.query('CREATE DATABASE "' + name + '"');
    databases.push(name);
    const url = new URL(databaseUrl!);
    url.pathname = '/' + name;
    return url.toString();
  }
  /** Open a tracked connection using either legacy synchronization or production migrations. */
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
  /** Assert that the migrated schema requires no changes to match the current entities. */
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

  it('bootstraps Presidencia and persists member area assignments on an empty migrated database', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = await createDatabase();
    process.env.DATABASE_SSL = 'false';
    process.env.AUTH_JWT_SECRET =
      'bootstrap-test-jwt-secret-at-least-32-characters';
    process.env.AUTH_BOOTSTRAP_SECRET =
      'bootstrap-test-secret-at-least-32-characters';
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    try {
      await app.listen(0, '127.0.0.1');
      const baseUrl = await app.getUrl();
      const payload = {
        bootstrapSecret: process.env.AUTH_BOOTSTRAP_SECRET,
        password: 'BootstrapTest123!',
        member: {
          institution: 'UNI',
          studentCode: '20260000',
          firstNames: 'Admin',
          lastNames: 'Presidencia',
          major: 'Ingenieria de Sistemas',
          birthDate: '2000-01-01',
          role: 'presidencia',
          skills: ['gestion'],
        },
      };
      const bootstrap = await fetch(baseUrl + '/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(bootstrap.status).toBe(201);
      const session = (await bootstrap.json()) as {
        accessToken: string;
        member: { id: number; role: string };
      };
      expect(session.accessToken).toEqual(expect.any(String));
      expect(session.member.role).toBe('presidencia');
      const login = await fetch(baseUrl + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: payload.member.studentCode,
          password: payload.password,
        }),
      });
      expect(login.status).toBe(201);
      const loginSession = (await login.json()) as {
        accessToken: string;
        member: { id: number };
      };
      expect(loginSession.accessToken).toEqual(expect.any(String));
      expect(loginSession.member.id).toBe(session.member.id);
      const ds = app.get(DataSource);
      expect(
        await ds.query('SELECT member_id, area_id, role FROM area_memberships'),
      ).toEqual([
        { member_id: session.member.id, area_id: null, role: 'presidencia' },
      ]);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + loginSession.accessToken,
      };
      const areaResponse = await fetch(baseUrl + '/areas', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Tecnologia' }),
      });
      expect(areaResponse.status).toBe(201);
      const area = (await areaResponse.json()) as { id: number };
      const memberResponse = await fetch(baseUrl + '/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload.member,
          studentCode: '20260001',
          role: 'miembro',
          areaId: area.id,
        }),
      });
      expect(memberResponse.status).toBe(201);
      const member = (await memberResponse.json()) as { id: number };
      expect(
        await ds.query(
          'SELECT member_id, area_id, role FROM area_memberships WHERE member_id = $1',
          [member.id],
        ),
      ).toEqual([{ member_id: member.id, area_id: area.id, role: 'miembro' }]);
      const nextAreaResponse = await fetch(baseUrl + '/areas', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Investigacion' }),
      });
      expect(nextAreaResponse.status).toBe(201);
      const nextArea = (await nextAreaResponse.json()) as { id: number };
      const memberships = await ds.query<{ id: number }[]>(
        'SELECT id FROM area_memberships WHERE member_id = $1',
        [member.id],
      );
      // Exercise both update services and inspect the stored foreign key.
      for (const change of [
        {
          path: '/area-memberships/' + memberships[0].id,
          areaId: nextArea.id,
        },
        { path: '/members/' + member.id, areaId: area.id },
        { path: '/members/' + member.id, areaId: null },
      ]) {
        const response = await fetch(baseUrl + change.path, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ areaId: change.areaId }),
        });
        expect(response.status).toBe(200);
        expect(
          await ds.query(
            'SELECT area_id FROM area_memberships WHERE member_id = $1',
            [member.id],
          ),
        ).toEqual([{ area_id: change.areaId }]);
      }
      const repeated = await fetch(baseUrl + '/auth/bootstrap', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      expect(repeated.status).toBe(409);
    } finally {
      await app.close();
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
      `INSERT INTO skills (name, normalized_name) VALUES ('Gestión', 'gestión'), ('gestion', 'gestion'), (' GESTION ', 'legacy-third')`,
    );
    await legacy.query(
      'INSERT INTO members_skills_skills ("membersId", "skillsId") VALUES (1, 3)',
    );
    await legacy.query("INSERT INTO areas (name) VALUES ('Test area')");
    await legacy.query(
      "INSERT INTO projects (name, area_id) VALUES ('Only highest', 1), ('All variants', 1)",
    );
    await legacy.query(
      "INSERT INTO project_labels (name, normalized_name) VALUES ('Gestión', 'legacy-1'), ('gestion', 'legacy-2'), (' GESTION ', 'legacy-3')",
    );
    await legacy.query(
      'INSERT INTO project_label_assignments (project_id, label_id) VALUES (1, 3), (2, 1), (2, 2), (2, 3)',
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
    expect(
      await upgraded.query('SELECT id, normalized_name FROM project_labels'),
    ).toEqual([{ id: 1, normalized_name: 'gestion' }]);
    expect(
      await upgraded.query(
        'SELECT project_id, label_id FROM project_label_assignments ORDER BY project_id',
      ),
    ).toEqual([
      { project_id: 1, label_id: 1 },
      { project_id: 2, label_id: 1 },
    ]);
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

  it('rejects an existing installation missing project_links before recording the baseline', async () => {
    const url = await createDatabase();
    const legacy = await connect(url, true);
    await legacy.query('DROP TABLE project_links');
    await legacy.destroy();
    await expect(connect(url)).rejects.toThrow(
      'complete existing baseline schema; missing: project_links',
    );
    const history = await admin.query<{ name: string }[]>(
      'SELECT datname AS name FROM pg_database WHERE datname = $1',
      [new URL(url).pathname.slice(1)],
    );
    expect(history).toHaveLength(1);
    const inspection = new DataSource({ type: 'postgres', url });
    connections.push(inspection);
    await inspection.initialize();
    expect(await inspection.query('SELECT name FROM migrations')).toEqual([]);
    expect(
      await inspection.query('SELECT COUNT(*)::int AS count FROM members'),
    ).toEqual([{ count: 0 }]);
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
