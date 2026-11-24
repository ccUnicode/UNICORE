import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDefaultProjectPhasesToSpanish1787788800009 implements MigrationInterface {
  name = 'MigrateDefaultProjectPhasesToSpanish1787788800009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable =
      typeof queryRunner.hasTable === 'function'
        ? await queryRunner.hasTable('project_phases')
        : true;

    if (!hasTable) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migrated_default_project_phases (
        phase_id INT PRIMARY KEY,
        previous_name VARCHAR(255) NOT NULL,
        translated_name VARCHAR(255) NOT NULL,
        previous_updated_at TIMESTAMP NOT NULL
      );
    `);

    // ProjectsService creates the project and its defaults in one transaction.
    // PostgreSQL now() is transaction-stable; later additions/edits do not share
    // both creation timestamps and unchanged updated_at. Skip ambiguous rows.
    await queryRunner.query(`
      INSERT INTO migrated_default_project_phases
        (phase_id, previous_name, translated_name, previous_updated_at)
      SELECT phase.id, phase.name, translation.spanish_name, phase.updated_at
      FROM project_phases phase
      JOIN projects project ON project.id = phase.project_id
      JOIN (VALUES
        ('Planning', 1, 'Planificación'), ('Execution', 2, 'Ejecución'),
        ('Review', 3, 'Revisión'), ('Launch', 4, 'Lanzamiento')
      ) AS translation(english_name, initial_order, spanish_name)
        ON phase.name = translation.english_name
       AND phase.order_index = translation.initial_order
      WHERE phase.created_at = project.created_at
        AND phase.updated_at = phase.created_at
        AND phase.description IS NULL
      ON CONFLICT (phase_id) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE project_phases phase
      SET name = migration.translated_name
      FROM migrated_default_project_phases migration
      WHERE phase.id = migration.phase_id
        AND phase.name = migration.previous_name
        AND phase.updated_at = migration.previous_updated_at;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable =
      typeof queryRunner.hasTable === 'function'
        ? await queryRunner.hasTable('project_phases')
        : true;

    if (!hasTable) {
      return;
    }

    const hasTrackingTable =
      typeof queryRunner.hasTable === 'function'
        ? await queryRunner.hasTable('migrated_default_project_phases')
        : true;

    if (!hasTrackingTable) {
      return;
    }

    await queryRunner.query(`
      UPDATE project_phases p
      SET name = m.previous_name
      FROM migrated_default_project_phases m
      WHERE p.id = m.phase_id
        AND p.name = m.translated_name
        AND p.updated_at = m.previous_updated_at;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS migrated_default_project_phases;
    `);
  }
}
