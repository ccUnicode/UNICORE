import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateMemberRolesAndAreas20260827 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRoleColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='role'
      );
    `)) as { exists: boolean }[];
    const exists = hasRoleColumn[0]?.exists;

    if (exists) {
      // 1. Copy data: migrate from members.role & members.area_id to area_memberships
      await queryRunner.query(`
        INSERT INTO area_memberships (member_id, area_id, role, created_at, updated_at)
        SELECT m.id, m.area_id, m.role, NOW(), NOW()
        FROM members m
        WHERE NOT EXISTS (
            SELECT 1 
            FROM area_memberships am 
            WHERE am.member_id = m.id 
              AND am.role = m.role 
              AND (am.area_id = m.area_id OR (am.area_id IS NULL AND m.area_id IS NULL))
        );
      `);

      // 2. Validate data: ensure all members have at least one membership
      const membersWithNoMembershipAfter = (await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM members m
        WHERE NOT EXISTS (
            SELECT 1 
            FROM area_memberships am 
            WHERE am.member_id = m.id
        );
      `)) as { count: string | number }[];

      const countAfter = Number(membersWithNoMembershipAfter[0].count);
      if (countAfter > 0) {
        throw new Error(
          `Data validation failed: ${countAfter} members have no area membership record after migration!`,
        );
      }

      // 3. Drop columns with CASCADE to handle foreign key / index dependencies
      await queryRunner.query(
        `ALTER TABLE members DROP COLUMN IF EXISTS role CASCADE;`,
      );
      await queryRunner.query(
        `ALTER TABLE members DROP COLUMN IF EXISTS area_id CASCADE;`,
      );
      await queryRunner.query(
        `ALTER TABLE members DROP COLUMN IF EXISTS status CASCADE;`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasRoleColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='role'
      );
    `)) as { exists: boolean }[];
    const exists = hasRoleColumn[0]?.exists;

    if (!exists) {
      // Re-create the columns with their original types
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS role varchar(30) DEFAULT 'miembro';`,
      );
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS area_id integer;`,
      );
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'Available';`,
      );

      // Restore data from area_memberships
      await queryRunner.query(`
        UPDATE members m
        SET 
          role = COALESCE(
            (SELECT am.role FROM area_memberships am WHERE am.member_id = m.id ORDER BY 
              CASE am.role 
                WHEN 'presidencia' THEN 1 
                WHEN 'directiva_de_area' THEN 2 
                ELSE 3 
              END ASC LIMIT 1),
            'miembro'
          ),
          area_id = (SELECT am.area_id FROM area_memberships am WHERE am.member_id = m.id AND am.area_id IS NOT NULL LIMIT 1),
          status = CASE m.availability_status
            WHEN 'available' THEN 'Available'
            WHEN 'not_available' THEN 'Not Available'
            WHEN 'disabled' THEN 'Disabled'
            ELSE 'Available'
          END;
      `);
    }
  }
}
