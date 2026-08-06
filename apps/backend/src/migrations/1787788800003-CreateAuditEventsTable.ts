import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditEventsTable1787788800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER NOT NULL,
        actor_name VARCHAR(255) NOT NULL,
        actor_role VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        area_id INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        metadata TEXT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_area_id" ON audit_events (area_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_actor_id" ON audit_events (actor_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_entity" ON audit_events (entity_type, entity_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_timestamp" ON audit_events (timestamp DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_events;');
  }
}
