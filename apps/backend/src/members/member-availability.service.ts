import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class MemberAvailabilityService {
  constructor(private readonly dataSource: DataSource) {}

  async refreshMembers(
    memberIds: number[],
    entityManager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const uniqueMemberIds = [
      ...new Set(memberIds.filter((memberId) => Number.isInteger(memberId))),
    ];

    if (uniqueMemberIds.length === 0) return;

    await entityManager.query(
      `
        WITH calculated_availability AS (
          SELECT target.id,
            CASE WHEN EXISTS (
              SELECT 1
              FROM task_assignees assignment
              INNER JOIN tasks task ON task.id = assignment.task_id
              INNER JOIN projects project ON project.id = task.project_id
              WHERE assignment.member_id = target.id
                AND task.status::text <> 'done'
                AND project.status::text = 'active'
                AND project.is_archived = FALSE
            ) THEN 'not_available' ELSE 'available' END AS status
          FROM members target
          WHERE target.id = ANY($1::int[])
            AND target.availability_status::text <> 'disabled'
        )
        UPDATE members member
        SET availability_status = calculated_availability.status::members_availability_status_enum,
            updated_at = CURRENT_TIMESTAMP
        FROM calculated_availability
        WHERE member.id = calculated_availability.id
          AND member.availability_status::text <> calculated_availability.status;
      `,
      [uniqueMemberIds],
    );
  }

  async refreshProjectMembers(
    projectId: number,
    entityManager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const rows: { memberId: number | string }[] = await entityManager.query(
      `
        SELECT DISTINCT assignment.member_id AS "memberId"
        FROM task_assignees assignment
        INNER JOIN tasks task ON task.id = assignment.task_id
        WHERE task.project_id = $1;
      `,
      [projectId],
    );
    await this.refreshMembers(
      rows.map(({ memberId }) => Number(memberId)),
      entityManager,
    );
  }
}
