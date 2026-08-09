import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMemberDisabledSnapshotCutoff1787788800006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('members'))) return;
    if (!(await queryRunner.hasColumn('members', 'disabled_at'))) {
      await queryRunner.addColumn(
        'members',
        new TableColumn({
          name: 'disabled_at',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('members', 'disabled_access_snapshot'))) {
      await queryRunner.addColumn(
        'members',
        new TableColumn({
          name: 'disabled_access_snapshot',
          type: 'jsonb',
          isNullable: true,
        }),
      );
    }
    await queryRunner.query(`
      UPDATE members AS member
      SET disabled_at = COALESCE(
        (
          SELECT MAX(event.timestamp)
          FROM audit_events AS event
          WHERE event.entity_type = 'Member'
            AND event.entity_id = member.id::text
            AND event.action = 'deactivate'
        ),
        member.updated_at
      )
      WHERE member.availability_status::text = 'disabled'
        AND member.disabled_at IS NULL;
    `);
    await queryRunner.query(`
      UPDATE members AS member
      SET disabled_access_snapshot = jsonb_build_object(
        'role', COALESCE(
          (
            SELECT membership.role
            FROM area_memberships AS membership
            WHERE membership.member_id = member.id
              AND membership.created_at <= member.disabled_at
              AND membership.updated_at <= member.disabled_at
            ORDER BY
              CASE membership.role
                WHEN 'presidencia' THEN 1
                WHEN 'directiva_de_area' THEN 2
                ELSE 3
              END,
              membership.id
            LIMIT 1
          ),
          'miembro'
        ),
        'areaId', (
          SELECT membership.area_id
          FROM area_memberships AS membership
          WHERE membership.member_id = member.id
            AND membership.created_at <= member.disabled_at
            AND membership.updated_at <= member.disabled_at
          ORDER BY
            CASE membership.role
              WHEN 'presidencia' THEN 1
              WHEN 'directiva_de_area' THEN 2
              ELSE 3
            END,
            membership.id
          LIMIT 1
        ),
        'projectIds', COALESCE(
          (
            SELECT jsonb_agg(membership.project_id ORDER BY membership.project_id)
            FROM project_memberships AS membership
            WHERE membership.member_id = member.id
              AND membership.created_at <= member.disabled_at
              AND membership.updated_at <= member.disabled_at
          ),
          '[]'::jsonb
        )
      )
      WHERE member.availability_status::text = 'disabled'
        AND member.disabled_access_snapshot IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE members
      DROP CONSTRAINT IF EXISTS chk_members_disabled_snapshot;
      ALTER TABLE members
      ADD CONSTRAINT chk_members_disabled_snapshot
      CHECK (
        availability_status::text <> 'disabled'
        OR (disabled_at IS NOT NULL AND disabled_access_snapshot IS NOT NULL)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE members
      DROP CONSTRAINT IF EXISTS chk_members_disabled_snapshot;
    `);
    if (await queryRunner.hasColumn('members', 'disabled_access_snapshot')) {
      await queryRunner.dropColumn('members', 'disabled_access_snapshot');
    }
    if (await queryRunner.hasColumn('members', 'disabled_at')) {
      await queryRunner.dropColumn('members', 'disabled_at');
    }
  }
}
