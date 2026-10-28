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

export const VERIFIABLE_DEFAULT_PHASE_ORDER: Record<string, number> = {
  Planning: 1,
  Execution: 2,
  Review: 3,
  Launch: 4,
};

export function isVerifiableDefaultPhase(
  name: string,
  orderIndex: number,
): boolean {
  return VERIFIABLE_DEFAULT_PHASE_ORDER[name] === orderIndex;
}

export function translatePhaseName(name: string, orderIndex?: number): string {
  if (orderIndex !== undefined && !isVerifiableDefaultPhase(name, orderIndex)) {
    return name;
  }
  return DEFAULT_PHASE_TRANSLATIONS[name] ?? name;
}

export function reverseTranslatePhaseName(
  name: string,
  orderIndex?: number,
): string {
  if (orderIndex !== undefined) {
    const englishName = REVERSE_DEFAULT_PHASE_TRANSLATIONS[name];
    if (
      englishName &&
      VERIFIABLE_DEFAULT_PHASE_ORDER[englishName] === orderIndex
    ) {
      return englishName;
    }
    return name;
  }
  return REVERSE_DEFAULT_PHASE_TRANSLATIONS[name] ?? name;
}

export interface PhaseRecord {
  id: number;
  name: string;
  orderIndex: number;
  projectId?: number;
}

export interface PhaseTrackingRecord {
  phase_id: number;
  previous_name: string;
}

export function migratePhasesInMemory(phases: PhaseRecord[]): {
  migratedPhases: PhaseRecord[];
  trackingRecords: PhaseTrackingRecord[];
} {
  const trackingRecords: PhaseTrackingRecord[] = [];
  const migratedPhases = phases.map((phase) => {
    if (isVerifiableDefaultPhase(phase.name, phase.orderIndex)) {
      trackingRecords.push({
        phase_id: phase.id,
        previous_name: phase.name,
      });
      return {
        ...phase,
        name: DEFAULT_PHASE_TRANSLATIONS[phase.name] ?? phase.name,
      };
    }
    return { ...phase };
  });

  return { migratedPhases, trackingRecords };
}

export function rollbackPhasesInMemory(
  phases: PhaseRecord[],
  trackingRecords: PhaseTrackingRecord[],
): PhaseRecord[] {
  const trackingMap = new Map(
    trackingRecords.map((r) => [r.phase_id, r.previous_name]),
  );
  return phases.map((phase) => {
    const previousName = trackingMap.get(phase.id);
    if (previousName !== undefined) {
      return {
        ...phase,
        name: previousName,
      };
    }
    return { ...phase };
  });
}

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
        previous_name VARCHAR(255) NOT NULL
      );
    `);

    await queryRunner.query(`
      INSERT INTO migrated_default_project_phases (phase_id, previous_name)
      SELECT id, name
      FROM project_phases
      WHERE (name = 'Planning' AND order_index = 1)
         OR (name = 'Execution' AND order_index = 2)
         OR (name = 'Review' AND order_index = 3)
         OR (name = 'Launch' AND order_index = 4)
      ON CONFLICT (phase_id) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE project_phases
      SET name = CASE
        WHEN name = 'Planning' THEN 'Planificación'
        WHEN name = 'Execution' THEN 'Ejecución'
        WHEN name = 'Review' THEN 'Revisión'
        WHEN name = 'Launch' THEN 'Lanzamiento'
        ELSE name
      END
      WHERE id IN (SELECT phase_id FROM migrated_default_project_phases);
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
      WHERE p.id = m.phase_id;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS migrated_default_project_phases;
    `);
  }
}
