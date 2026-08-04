import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCollaboration1787788800002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const requiredTables = (await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('tasks', 'members');
    `)) as { count: number }[];

    // On a fresh database TypeORM synchronization creates the full schema.
    if (Number(requiredTables[0]?.count) !== 2) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        content VARCHAR(2000) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_comments_task_created"
      ON task_comments (task_id, created_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_status_history (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        previous_status tasks_status_enum NOT NULL,
        new_status tasks_status_enum NOT NULL,
        actor_id INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_status_history_task_created"
      ON task_status_history (task_id, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS task_status_history;');
    await queryRunner.query('DROP TABLE IF EXISTS task_comments;');
  }
}
