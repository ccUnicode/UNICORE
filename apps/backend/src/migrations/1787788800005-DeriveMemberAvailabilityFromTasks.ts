import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeriveMemberAvailabilityFromTasks1787788800005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const requiredTables = (await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('members', 'projects', 'tasks', 'task_assignees');
    `)) as { count: number }[];

    if (Number(requiredTables[0]?.count) !== 4) return;

    await queryRunner.query(`
      UPDATE members member
      SET availability_status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM task_assignees assignment
          INNER JOIN tasks task ON task.id = assignment.task_id
          INNER JOIN projects project ON project.id = task.project_id
          WHERE assignment.member_id = member.id
            AND task.status::text <> 'done'
            AND project.status::text = 'active'
            AND project.is_archived = FALSE
        ) THEN 'not_available'::members_availability_status_enum
        ELSE 'available'::members_availability_status_enum
      END
      WHERE member.availability_status::text <> 'disabled';
    `);
  }

  public async down(): Promise<void> {}
}
