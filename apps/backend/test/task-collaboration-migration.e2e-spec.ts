import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AddTaskCollaboration1787788800002 } from '../src/migrations/1787788800002-AddTaskCollaboration';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithPostgres = databaseUrl ? describe : describe.skip;

describeWithPostgres('task collaboration migration (PostgreSQL)', () => {
  let adminDataSource: DataSource;
  let schemaDataSource: DataSource;
  const schema = `task_collaboration_${Date.now()}`;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA "${schema}"`);

    schemaDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      schema,
      entities: [join(__dirname, '../src/**/*.entity.{ts,js}')],
      synchronize: true,
    });
    await schemaDataSource.initialize();

    // The synchronized schema represents the current entity graph. Removing
    // only this feature's tables recreates the relevant pre-UNI2-29 state.
    await schemaDataSource.query(
      `DROP TABLE "${schema}"."task_status_history"`,
    );
    await schemaDataSource.query(`DROP TABLE "${schema}"."task_comments"`);
  });

  afterAll(async () => {
    if (schemaDataSource?.isInitialized) {
      await schemaDataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminDataSource.destroy();
    }
  });

  it('applies and reverts tables, shared enums, foreign keys, and indexes', async () => {
    const queryRunner = schemaDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`SET search_path TO "${schema}"`);
    const migration = new AddTaskCollaboration1787788800002();

    try {
      await migration.up(queryRunner);

      const tables = (await queryRunner.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = $1
           AND table_name IN ('task_comments', 'task_status_history')
         ORDER BY table_name`,
        [schema],
      )) as { table_name: string }[];
      expect(tables.map(({ table_name }) => table_name)).toEqual([
        'task_comments',
        'task_status_history',
      ]);

      const enumColumns = (await queryRunner.query(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_schema = $1
           AND table_name = 'task_status_history'
           AND column_name IN ('previous_status', 'new_status')
         ORDER BY column_name`,
        [schema],
      )) as { column_name: string; udt_name: string }[];
      expect(enumColumns).toEqual([
        { column_name: 'new_status', udt_name: 'tasks_status_enum' },
        { column_name: 'previous_status', udt_name: 'tasks_status_enum' },
      ]);

      const foreignKeys = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count
         FROM pg_constraint constraint_record
         JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
         JOIN pg_namespace namespace_record ON namespace_record.oid = table_record.relnamespace
         WHERE namespace_record.nspname = $1
           AND table_record.relname IN ('task_comments', 'task_status_history')
           AND constraint_record.contype = 'f'`,
        [schema],
      )) as { count: number }[];
      expect(Number(foreignKeys[0]?.count)).toBe(4);

      const indexes = (await queryRunner.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE schemaname = $1
           AND indexname IN (
             'IDX_task_comments_task_created',
             'IDX_task_status_history_task_created'
           )
         ORDER BY indexname`,
        [schema],
      )) as { indexname: string }[];
      expect(indexes.map(({ indexname }) => indexname)).toEqual([
        'IDX_task_comments_task_created',
        'IDX_task_status_history_task_created',
      ]);

      await migration.down(queryRunner);

      const collaborationTables = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count
         FROM information_schema.tables
         WHERE table_schema = $1
           AND table_name IN ('task_comments', 'task_status_history')`,
        [schema],
      )) as { count: number }[];
      expect(Number(collaborationTables[0]?.count)).toBe(0);

      const baseTables = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count
         FROM information_schema.tables
         WHERE table_schema = $1
           AND table_name IN ('members', 'tasks')`,
        [schema],
      )) as { count: number }[];
      expect(Number(baseTables[0]?.count)).toBe(2);
    } finally {
      await queryRunner.release();
    }
  });
});
