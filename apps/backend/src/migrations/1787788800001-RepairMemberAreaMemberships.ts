import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairMemberAreaMemberships1787788800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAreaIdColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'area_memberships'
          AND column_name = 'area_id'
      );
    `)) as { exists: boolean }[];

    if (hasAreaIdColumn[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE area_memberships ALTER COLUMN area_id DROP NOT NULL;
      `);
    }

    const hasAvailabilityStatusColumn = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'members'
          AND column_name = 'availability_status'
      );
    `)) as { exists: boolean }[];

    if (hasAvailabilityStatusColumn[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE members
        ALTER COLUMN availability_status
        SET DEFAULT 'available'::members_availability_status_enum;
      `);
    }
  }

  public down(): Promise<void> {
    // This repair only aligns existing databases with the current nullable and
    // default constraints. Reintroducing the invalid constraints is unsafe.
    return Promise.resolve();
  }
}
