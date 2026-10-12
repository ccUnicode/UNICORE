import { MigrationInterface, QueryRunner } from 'typeorm';

export const DEFAULT_PHASE_TRANSLATIONS: Record<string, string> = {
  Planning: 'Planificación',
  Execution: 'Ejecución',
  Review: 'Revisión',
  Launch: 'Lanzamiento',
};

export const REVERSE_DEFAULT_PHASE_TRANSLATIONS: Record<string, string> = {
  Planificación: 'Planning',
  Ejecución: 'Execution',
  Revisión: 'Review',
  Lanzamiento: 'Launch',
};

export function translatePhaseName(name: string): string {
  return DEFAULT_PHASE_TRANSLATIONS[name] ?? name;
}

export function reverseTranslatePhaseName(name: string): string {
  return REVERSE_DEFAULT_PHASE_TRANSLATIONS[name] ?? name;
}

export class MigrateDefaultProjectPhasesToSpanish1787788800008 implements MigrationInterface {
  name = 'MigrateDefaultProjectPhasesToSpanish1787788800008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable =
      typeof queryRunner.hasTable === 'function'
        ? await queryRunner.hasTable('project_phases')
        : true;

    if (!hasTable) {
      return;
    }

    await queryRunner.query(`
      UPDATE project_phases
      SET name = CASE
        WHEN name = 'Planning' THEN 'Planificación'
        WHEN name = 'Execution' THEN 'Ejecución'
        WHEN name = 'Review' THEN 'Revisión'
        WHEN name = 'Launch' THEN 'Lanzamiento'
        ELSE name
      END
      WHERE name IN ('Planning', 'Execution', 'Review', 'Launch');
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

    await queryRunner.query(`
      UPDATE project_phases
      SET name = CASE
        WHEN name = 'Planificación' THEN 'Planning'
        WHEN name = 'Ejecución' THEN 'Execution'
        WHEN name = 'Revisión' THEN 'Review'
        WHEN name = 'Lanzamiento' THEN 'Launch'
        ELSE name
      END
      WHERE name IN ('Planificación', 'Ejecución', 'Revisión', 'Lanzamiento');
    `);
  }
}
