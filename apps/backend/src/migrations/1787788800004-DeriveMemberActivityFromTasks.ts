import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeriveMemberActivityFromTasks1787788800004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const requiredTables = (await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('members', 'projects', 'tasks', 'task_assignees');
    `)) as { count: number }[];

    // On a fresh database TypeORM synchronization creates the full schema.
    if (Number(requiredTables[0]?.count) !== 4) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE members
      ALTER COLUMN activity_status
      SET DEFAULT 'inactive'::members_activity_status_enum;
    `);

    await queryRunner.query(`
      UPDATE members member
      SET activity_status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM task_assignees assignment
          INNER JOIN tasks task ON task.id = assignment.task_id
          INNER JOIN projects project ON project.id = task.project_id
          WHERE assignment.member_id = member.id
            AND task.status::text IN ('in_progress', 'in_review')
            AND project.status::text = 'active'
            AND project.is_archived = FALSE
        ) THEN 'active'::members_activity_status_enum
        ELSE 'inactive'::members_activity_status_enum
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasMembersTable = await queryRunner.hasTable('members');
    if (!hasMembersTable) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE members
      ALTER COLUMN activity_status
      SET DEFAULT 'active'::members_activity_status_enum;
    `);
  }
}
