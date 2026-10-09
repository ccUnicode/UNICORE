import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalizeSearchNormalization1787788800008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('skills', 'legacy_normalized_name')) {
      await queryRunner.query(
        'ALTER TABLE skills DROP COLUMN legacy_normalized_name',
      );
    }
    // Installations that already ran 0007 may have synchronized its indexes away.
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_skills_normalized_name" ON skills (normalized_name)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_project_labels_normalized_name" ON project_labels (normalized_name)',
    );
    await queryRunner.query(
      'ALTER TABLE skills DROP CONSTRAINT IF EXISTS "UQ_31bde3219e61eb19bc183b2a006"',
    );
    await queryRunner.query(
      'ALTER TABLE project_labels DROP CONSTRAINT IF EXISTS "UQ_28436983a02723256a6c833ec53"',
    );
    // Older synchronization removed these migration-owned indexes/checks.
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_events_area_id" ON audit_events (area_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_events_actor_id" ON audit_events (actor_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_events_entity" ON audit_events (entity_type, entity_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_events_timestamp" ON audit_events (timestamp DESC)',
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'members'::regclass
            AND conname = 'chk_members_disabled_snapshot'
        ) THEN
          ALTER TABLE members ADD CONSTRAINT chk_members_disabled_snapshot
          CHECK (availability_status::text <> 'disabled'
            OR (disabled_at IS NOT NULL AND disabled_access_snapshot IS NOT NULL));
        END IF;
      END $$;
    `);
  }
  down(): Promise<void> {
    return Promise.resolve();
  }
}
