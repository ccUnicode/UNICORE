import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateMemberRolesAndAreas1787788800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop NOT NULL restriction on area_memberships.area_id
    await queryRunner.query(`
      ALTER TABLE area_memberships ALTER COLUMN area_id DROP NOT NULL;
    `);

    // 2. Convert availability_status column to varchar to allow updating enum values safely in a transaction
    const hasAvailabilityStatusColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='availability_status'
      );
    `)) as { exists: boolean }[];

    if (hasAvailabilityStatusColumn[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status TYPE varchar(50);
      `);
      await queryRunner.query(`
        UPDATE members 
        SET availability_status = 'not_available' 
        WHERE availability_status = 'unavailable';
      `);
    }

    const hasRoleColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='role'
      );
    `)) as { exists: boolean }[];
    const exists = hasRoleColumn[0]?.exists;

    if (exists) {
      // 3. Copy data: migrate from members.role & members.area_id to area_memberships
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

      // 4. Validate data: ensure all members have at least one membership
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

      // 5. Drop columns with CASCADE to handle foreign key / index dependencies
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

    // Revert enum change and restore NOT NULL if needed (TypeORM sync handles NOT NULL generally, but let's revert data update)
    const hasAvailabilityStatusColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='availability_status'
      );
    `)) as { exists: boolean }[];

    if (hasAvailabilityStatusColumn[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status TYPE varchar(50);
      `);
      await queryRunner.query(`
        UPDATE members 
        SET availability_status = 'unavailable' 
        WHERE availability_status = 'not_available';
      `);
    }
  }
}
