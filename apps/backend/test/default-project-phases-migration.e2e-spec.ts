import { DataSource, QueryRunner } from 'typeorm';
import { MigrateDefaultProjectPhasesToSpanish1787788800009 } from '../src/migrations/1787788800009-MigrateDefaultProjectPhasesToSpanish';
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required');
describe('default project phases migration (PostgreSQL)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  const schema = `default_phases_${Date.now()}`;
  const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
  beforeAll(async () => {
    source = new DataSource({ type: 'postgres', url: databaseUrl, schema });
    await source.initialize();
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(
      `CREATE TABLE projects (id SERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await runner.query(`CREATE TABLE project_phases (
      id SERIAL PRIMARY KEY, project_id INT REFERENCES projects(id), name VARCHAR(255) NOT NULL,
      order_index INT NOT NULL, description VARCHAR(2000), created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now())`);
    // Match ProjectsService.create: defaults share the project's transaction.
    await runner.startTransaction();
    await runner.query('INSERT INTO projects DEFAULT VALUES');
    await runner.query(`INSERT INTO project_phases (project_id, name, order_index)
      VALUES (1, 'Planning', 1), (1, 'Execution', 2), (1, 'Review', 3), (1, 'Launch', 4)`);
    await runner.commitTransaction();
    await runner.query(`INSERT INTO project_phases (project_id, name, order_index)
      VALUES (1, 'Review', 3), (1, 'Revisión', 3)`);
    // A renamed original can again have a default name and position.
    await runner.query(
      `UPDATE project_phases SET name = 'Review', updated_at = created_at + interval '1 second' WHERE id = 3`,
    );
  });
  afterAll(async () => {
    if (runner) {
      await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await runner.release();
    }
    if (source?.isInitialized) await source.destroy();
  });
  it('preserves custom phases at a default position, already Spanish phases and edits after migration', async () => {
    const names = async () =>
      runner.query(
        'SELECT id, name FROM project_phases ORDER BY id',
      ) as Promise<{ id: number; name: string }[]>;
    await migration.up(runner);
    expect(await names()).toEqual([
      { id: 1, name: 'Planificación' },
      { id: 2, name: 'Ejecución' },
      { id: 3, name: 'Review' },
      { id: 4, name: 'Lanzamiento' },
      { id: 5, name: 'Review' },
      { id: 6, name: 'Revisión' },
    ]);
    await migration.up(runner);
    await runner.query(
      `UPDATE project_phases SET name = 'Diseño personalizado', updated_at = now() WHERE id = 1`,
    );
    await migration.down(runner);
    expect(await names()).toEqual([
      { id: 1, name: 'Diseño personalizado' },
      { id: 2, name: 'Execution' },
      { id: 3, name: 'Review' },
      { id: 4, name: 'Launch' },
      { id: 5, name: 'Review' },
      { id: 6, name: 'Revisión' },
    ]);
    expect(await runner.hasTable('migrated_default_project_phases')).toBe(
      false,
    );
  });
});
