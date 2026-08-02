import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateMemberRolesAndAreas1787788800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the members table exists
    const hasMembersTable = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name='members'
      );
    `)) as { exists: boolean }[];

    if (!hasMembersTable[0]?.exists) {
      return;
    }

    // 1. Create area_memberships table if it does not exist (since synchronize hasn't run yet)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS area_memberships (
        id SERIAL PRIMARY KEY,
        role VARCHAR(30) DEFAULT 'miembro',
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (member_id, area_id)
      );
    `);
    // 2. Convert availability_status column to enum with 'not_available' instead of 'unavailable'
    const hasAvailabilityStatusColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='availability_status'
      );
    `)) as { exists: boolean }[];

    if (hasAvailabilityStatusColumn[0]?.exists) {
      await queryRunner.query(`
        DROP TYPE IF EXISTS members_availability_status_enum_old;
      `);
      await queryRunner.query(`
        ALTER TYPE members_availability_status_enum RENAME TO members_availability_status_enum_old;
      `);
      await queryRunner.query(`
        CREATE TYPE members_availability_status_enum AS ENUM ('available', 'not_available', 'disabled');
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status DROP DEFAULT;
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status TYPE members_availability_status_enum 
          USING CASE availability_status::varchar
            WHEN 'unavailable' THEN 'not_available'::members_availability_status_enum
            ELSE availability_status::varchar::members_availability_status_enum
          END;
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status SET DEFAULT 'available'::members_availability_status_enum;
      `);
      await queryRunner.query(`
        DROP TYPE members_availability_status_enum_old;
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
      // Create tracking table for migrated memberships
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS _migrated_area_memberships (
          membership_id INTEGER PRIMARY KEY
        );
      `);

      // 3. Copy data: migrate from members.role & members.area_id to area_memberships and track IDs
      await queryRunner.query(`
        WITH inserted AS (
          INSERT INTO area_memberships (member_id, area_id, role, created_at, updated_at)
          SELECT m.id, m.area_id, m.role::varchar, NOW(), NOW()
          FROM members m
          WHERE NOT EXISTS (
              SELECT 1 
              FROM area_memberships am 
              WHERE am.member_id = m.id 
                AND am.role = m.role::varchar 
                AND (am.area_id = m.area_id OR (am.area_id IS NULL AND m.area_id IS NULL))
          )
          RETURNING id
        )
        INSERT INTO _migrated_area_memberships (membership_id)
        SELECT id FROM inserted;
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
    const hasMembersTable = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name='members'
      );
    `)) as { exists: boolean }[];

    if (!hasMembersTable[0]?.exists) {
      return;
    }

    const hasRoleColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='role'
      );
    `)) as { exists: boolean }[];
    const exists = hasRoleColumn[0]?.exists;

    if (!exists) {
      // Re-create the role enum type if it does not exist
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE members_role_enum AS ENUM ('presidencia', 'directiva_de_area', 'miembro');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Re-create the status enum type if it does not exist
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE members_status_enum AS ENUM ('Available', 'Unavailable', 'Disabled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Re-create the columns with their original types
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS role members_role_enum DEFAULT 'miembro';`,
      );
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS area_id integer;`,
      );
      await queryRunner.query(
        `ALTER TABLE members ADD COLUMN IF NOT EXISTS status members_status_enum DEFAULT 'Available';`,
      );

      // Restore data from area_memberships
      await queryRunner.query(`
        UPDATE members m
        SET 
          role = COALESCE(
            (SELECT am.role::members_role_enum FROM area_memberships am WHERE am.member_id = m.id ORDER BY 
              CASE am.role 
                WHEN 'presidencia' THEN 1 
                WHEN 'directiva_de_area' THEN 2 
                ELSE 3 
              END ASC LIMIT 1),
            'miembro'::members_role_enum
          ),
          area_id = (SELECT am.area_id FROM area_memberships am WHERE am.member_id = m.id AND am.area_id IS NOT NULL LIMIT 1),
          status = CASE m.availability_status::varchar
            WHEN 'available' THEN 'Available'::members_status_enum
            WHEN 'not_available' THEN 'Unavailable'::members_status_enum
            WHEN 'disabled' THEN 'Disabled'::members_status_enum
            ELSE 'Available'::members_status_enum
          END;
      `);
    }

    // Revert cycle column if it exists
    await queryRunner.query(
      `ALTER TABLE members DROP COLUMN IF EXISTS cycle CASCADE;`,
    );

    // Revert enum change and restore NOT NULL if needed
    const hasAvailabilityStatusColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='members' AND column_name='availability_status'
      );
    `)) as { exists: boolean }[];

    if (hasAvailabilityStatusColumn[0]?.exists) {
      await queryRunner.query(`
        DROP TYPE IF EXISTS members_availability_status_enum_new;
      `);
      await queryRunner.query(`
        ALTER TYPE members_availability_status_enum RENAME TO members_availability_status_enum_new;
      `);
      await queryRunner.query(`
        CREATE TYPE members_availability_status_enum AS ENUM ('available', 'unavailable', 'disabled');
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status DROP DEFAULT;
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status TYPE members_availability_status_enum 
          USING CASE availability_status::varchar
            WHEN 'not_available' THEN 'unavailable'::members_availability_status_enum
            ELSE availability_status::varchar::members_availability_status_enum
          END;
      `);
      await queryRunner.query(`
        ALTER TABLE members ALTER COLUMN availability_status SET DEFAULT 'available'::members_availability_status_enum;
      `);
      await queryRunner.query(`
        DROP TYPE members_availability_status_enum_new;
      `);
    }

    // Revert the row changes: delete only the tracked memberships
    const hasTrackingTable = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name='_migrated_area_memberships'
      );
    `)) as { exists: boolean }[];

    if (hasTrackingTable[0]?.exists) {
      await queryRunner.query(`
        DELETE FROM area_memberships 
        WHERE id IN (SELECT membership_id FROM _migrated_area_memberships);
      `);
      await queryRunner.query(`
        DROP TABLE IF EXISTS _migrated_area_memberships;
      `);
    }
  }
}
