/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import {
  DEFAULT_PHASE_TRANSLATIONS,
  isVerifiableDefaultPhase,
  MigrateDefaultProjectPhasesToSpanish1787788800009,
  migratePhasesInMemory,
  PhaseRecord,
  REVERSE_DEFAULT_PHASE_TRANSLATIONS,
  reverseTranslatePhaseName,
  rollbackPhasesInMemory,
  translatePhaseName,
  VERIFIABLE_DEFAULT_PHASE_ORDER,
} from './1787788800009-MigrateDefaultProjectPhasesToSpanish';

describe('MigrateDefaultProjectPhasesToSpanish1787788800009', () => {
  describe('up', () => {
    it('creates tracking table, records verifiable default phases, and migrates them to Spanish', async () => {
      const queries: string[] = [];
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(true),
        query: jest.fn((sql: string) => {
          queries.push(sql.replace(/\s+/g, ' ').trim());
          return Promise.resolve([]);
        }),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
      await migration.up(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).toHaveBeenCalledTimes(3);

      // Query 1: create tracking table
      expect(queries[0]).toContain(
        'CREATE TABLE IF NOT EXISTS migrated_default_project_phases',
      );
      expect(queries[0]).toContain('phase_id INT PRIMARY KEY');
      expect(queries[0]).toContain('previous_name VARCHAR(255) NOT NULL');

      // Query 2: insert only verifiable default phases
      expect(queries[1]).toContain(
        'INSERT INTO migrated_default_project_phases (phase_id, previous_name)',
      );
      expect(queries[1]).toContain("(name = 'Planning' AND order_index = 1)");
      expect(queries[1]).toContain("(name = 'Execution' AND order_index = 2)");
      expect(queries[1]).toContain("(name = 'Review' AND order_index = 3)");
      expect(queries[1]).toContain("(name = 'Launch' AND order_index = 4)");
      expect(queries[1]).toContain('ON CONFLICT (phase_id) DO NOTHING');

      // Query 3: update project_phases strictly for recorded phase_ids
      expect(queries[2]).toContain('UPDATE project_phases');
      expect(queries[2]).toContain(
        "WHEN name = 'Planning' THEN 'Planificación'",
      );
      expect(queries[2]).toContain("WHEN name = 'Execution' THEN 'Ejecución'");
      expect(queries[2]).toContain("WHEN name = 'Review' THEN 'Revisión'");
      expect(queries[2]).toContain("WHEN name = 'Launch' THEN 'Lanzamiento'");
      expect(queries[2]).toContain(
        'WHERE id IN (SELECT phase_id FROM migrated_default_project_phases)',
      );
    });

    it('skips execution when project_phases table does not exist', async () => {
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(false),
        query: jest.fn().mockResolvedValue([]),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
      await migration.up(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).not.toHaveBeenCalled();
    });
  });

  describe('down', () => {
    it('reverts only recorded phases from tracking table and drops tracking table', async () => {
      const queries: string[] = [];
      const queryRunner = {
        hasTable: jest.fn().mockImplementation((tableName: string) => {
          if (tableName === 'project_phases') return Promise.resolve(true);
          if (tableName === 'migrated_default_project_phases')
            return Promise.resolve(true);
          return Promise.resolve(false);
        }),
        query: jest.fn((sql: string) => {
          queries.push(sql.replace(/\s+/g, ' ').trim());
          return Promise.resolve([]);
        }),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
      await migration.down(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.hasTable).toHaveBeenCalledWith(
        'migrated_default_project_phases',
      );
      expect(queryRunner.query).toHaveBeenCalledTimes(2);

      // Query 1: revert phase names from tracking table
      expect(queries[0]).toContain('UPDATE project_phases p');
      expect(queries[0]).toContain('SET name = m.previous_name');
      expect(queries[0]).toContain('FROM migrated_default_project_phases m');
      expect(queries[0]).toContain('WHERE p.id = m.phase_id');

      // Query 2: drop tracking table
      expect(queries[1]).toContain(
        'DROP TABLE IF EXISTS migrated_default_project_phases',
      );
    });

    it('skips rollback when project_phases table does not exist', async () => {
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(false),
        query: jest.fn().mockResolvedValue([]),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
      await migration.down(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).not.toHaveBeenCalled();
    });

    it('skips rollback when migrated_default_project_phases table does not exist', async () => {
      const queryRunner = {
        hasTable: jest.fn().mockImplementation((tableName: string) => {
          if (tableName === 'project_phases') return Promise.resolve(true);
          if (tableName === 'migrated_default_project_phases')
            return Promise.resolve(false);
          return Promise.resolve(false);
        }),
        query: jest.fn().mockResolvedValue([]),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800009();
      await migration.down(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.hasTable).toHaveBeenCalledWith(
        'migrated_default_project_phases',
      );
      expect(queryRunner.query).not.toHaveBeenCalled();
    });
  });

  describe('verifiable default phases identification', () => {
    it('defines the 4 required English to Spanish mappings in order', () => {
      expect(DEFAULT_PHASE_TRANSLATIONS).toEqual({
        Planning: 'Planificación',
        Execution: 'Ejecución',
        Review: 'Revisión',
        Launch: 'Lanzamiento',
      });
      expect(VERIFIABLE_DEFAULT_PHASE_ORDER).toEqual({
        Planning: 1,
        Execution: 2,
        Review: 3,
        Launch: 4,
      });
    });

    it('defines the reverse Spanish to English mappings', () => {
      expect(REVERSE_DEFAULT_PHASE_TRANSLATIONS).toEqual({
        Planificación: 'Planning',
        Ejecución: 'Execution',
        Revisión: 'Review',
        Lanzamiento: 'Launch',
      });
    });

    it('identifies verifiable default phases by exact name and orderIndex', () => {
      expect(isVerifiableDefaultPhase('Planning', 1)).toBe(true);
      expect(isVerifiableDefaultPhase('Execution', 2)).toBe(true);
      expect(isVerifiableDefaultPhase('Review', 3)).toBe(true);
      expect(isVerifiableDefaultPhase('Launch', 4)).toBe(true);

      // Custom phases with same name but different index must not match
      expect(isVerifiableDefaultPhase('Review', 5)).toBe(false);
      expect(isVerifiableDefaultPhase('Planning', 2)).toBe(false);
      expect(isVerifiableDefaultPhase('Execution', 1)).toBe(false);
      expect(isVerifiableDefaultPhase('Launch', 3)).toBe(false);

      // Phases already in Spanish must not match
      expect(isVerifiableDefaultPhase('Planificación', 1)).toBe(false);
      expect(isVerifiableDefaultPhase('Revisión', 3)).toBe(false);
    });

    it('translates only verifiable default phase names when orderIndex is specified', () => {
      expect(translatePhaseName('Planning', 1)).toBe('Planificación');
      expect(translatePhaseName('Execution', 2)).toBe('Ejecución');
      expect(translatePhaseName('Review', 3)).toBe('Revisión');
      expect(translatePhaseName('Launch', 4)).toBe('Lanzamiento');

      // Custom phases named "Review" at other positions must remain untouched
      expect(translatePhaseName('Review', 5)).toBe('Review');
      expect(translatePhaseName('Planning', 3)).toBe('Planning');
    });

    it('leaves custom or arbitrary phase names untouched', () => {
      expect(translatePhaseName('Validación con cliente', 3)).toBe(
        'Validación con cliente',
      );
      expect(translatePhaseName('QA', 5)).toBe('QA');
      expect(translatePhaseName('Pruebas de aceptación')).toBe(
        'Pruebas de aceptación',
      );
      expect(translatePhaseName('Diseño UI')).toBe('Diseño UI');
    });

    it('leaves already translated Spanish phase names untouched', () => {
      expect(translatePhaseName('Planificación', 1)).toBe('Planificación');
      expect(translatePhaseName('Ejecución', 2)).toBe('Ejecución');
      expect(translatePhaseName('Revisión', 3)).toBe('Revisión');
      expect(translatePhaseName('Lanzamiento', 4)).toBe('Lanzamiento');
    });

    it('reverse translates only verifiable Spanish default phase names when orderIndex is specified', () => {
      expect(reverseTranslatePhaseName('Planificación', 1)).toBe('Planning');
      expect(reverseTranslatePhaseName('Ejecución', 2)).toBe('Execution');
      expect(reverseTranslatePhaseName('Revisión', 3)).toBe('Review');
      expect(reverseTranslatePhaseName('Lanzamiento', 4)).toBe('Launch');

      // Custom phases named "Revisión" at other positions must remain untouched
      expect(reverseTranslatePhaseName('Revisión', 5)).toBe('Revisión');
      expect(reverseTranslatePhaseName('Planificación', 3)).toBe(
        'Planificación',
      );
    });
  });

  describe('migration lifecycle simulation (custom phases & already Spanish phases)', () => {
    it('translates verifiable default phases, leaves custom and Spanish phases untouched, and rolls back only translated rows', () => {
      const initialPhases: PhaseRecord[] = [
        // Project 1: Standard legacy English default phases
        { id: 1, name: 'Planning', orderIndex: 1, projectId: 1 },
        { id: 2, name: 'Execution', orderIndex: 2, projectId: 1 },
        { id: 3, name: 'Review', orderIndex: 3, projectId: 1 },
        { id: 4, name: 'Launch', orderIndex: 4, projectId: 1 },

        // Project 2: Custom phase named "Review" and other custom phases
        { id: 5, name: 'Planning', orderIndex: 1, projectId: 2 },
        { id: 6, name: 'Execution', orderIndex: 2, projectId: 2 },
        { id: 7, name: 'Review', orderIndex: 3, projectId: 2 },
        { id: 8, name: 'Review', orderIndex: 5, projectId: 2 }, // Custom phase named "Review"
        { id: 9, name: 'QA Interno', orderIndex: 6, projectId: 2 },

        // Project 3: Already initialized in Spanish (must NOT be touched or reverted)
        { id: 10, name: 'Planificación', orderIndex: 1, projectId: 3 },
        { id: 11, name: 'Ejecución', orderIndex: 2, projectId: 3 },
        { id: 12, name: 'Revisión', orderIndex: 3, projectId: 3 },
        { id: 13, name: 'Lanzamiento', orderIndex: 4, projectId: 3 },
      ];

      // Step 1: Execute up() simulation
      const { migratedPhases, trackingRecords } =
        migratePhasesInMemory(initialPhases);

      // Verify tracking records: only verifiable English default phases were recorded
      expect(trackingRecords).toEqual([
        { phase_id: 1, previous_name: 'Planning' },
        { phase_id: 2, previous_name: 'Execution' },
        { phase_id: 3, previous_name: 'Review' },
        { phase_id: 4, previous_name: 'Launch' },
        { phase_id: 5, previous_name: 'Planning' },
        { phase_id: 6, previous_name: 'Execution' },
        { phase_id: 7, previous_name: 'Review' },
      ]);

      // Phase 8 (Review at index 5) must NOT be recorded
      expect(trackingRecords.some((r) => r.phase_id === 8)).toBe(false);
      // Phases 10-13 (already Spanish) must NOT be recorded
      expect(trackingRecords.some((r) => r.phase_id >= 10)).toBe(false);

      // Verify migrated state
      expect(migratedPhases.find((p) => p.id === 1)?.name).toBe(
        'Planificación',
      );
      expect(migratedPhases.find((p) => p.id === 2)?.name).toBe('Ejecución');
      expect(migratedPhases.find((p) => p.id === 3)?.name).toBe('Revisión');
      expect(migratedPhases.find((p) => p.id === 4)?.name).toBe('Lanzamiento');

      // Custom phase named "Review" at orderIndex 5 remains untouched
      expect(migratedPhases.find((p) => p.id === 8)?.name).toBe('Review');
      expect(migratedPhases.find((p) => p.id === 9)?.name).toBe('QA Interno');

      // Already Spanish phases remain in Spanish
      expect(migratedPhases.find((p) => p.id === 10)?.name).toBe(
        'Planificación',
      );
      expect(migratedPhases.find((p) => p.id === 11)?.name).toBe('Ejecución');
      expect(migratedPhases.find((p) => p.id === 12)?.name).toBe('Revisión');
      expect(migratedPhases.find((p) => p.id === 13)?.name).toBe('Lanzamiento');

      // Step 2: Execute down() simulation
      const rolledBackPhases = rollbackPhasesInMemory(
        migratedPhases,
        trackingRecords,
      );

      // Verify rollback: only tracked phases were reverted
      expect(rolledBackPhases.find((p) => p.id === 1)?.name).toBe('Planning');
      expect(rolledBackPhases.find((p) => p.id === 2)?.name).toBe('Execution');
      expect(rolledBackPhases.find((p) => p.id === 3)?.name).toBe('Review');
      expect(rolledBackPhases.find((p) => p.id === 4)?.name).toBe('Launch');
      expect(rolledBackPhases.find((p) => p.id === 5)?.name).toBe('Planning');
      expect(rolledBackPhases.find((p) => p.id === 6)?.name).toBe('Execution');
      expect(rolledBackPhases.find((p) => p.id === 7)?.name).toBe('Review');

      // Custom phase still untouched
      expect(rolledBackPhases.find((p) => p.id === 8)?.name).toBe('Review');
      expect(rolledBackPhases.find((p) => p.id === 9)?.name).toBe('QA Interno');

      // Pre-existing Spanish phases were NOT reverted to English!
      expect(rolledBackPhases.find((p) => p.id === 10)?.name).toBe(
        'Planificación',
      );
      expect(rolledBackPhases.find((p) => p.id === 11)?.name).toBe('Ejecución');
      expect(rolledBackPhases.find((p) => p.id === 12)?.name).toBe('Revisión');
      expect(rolledBackPhases.find((p) => p.id === 13)?.name).toBe(
        'Lanzamiento',
      );

      // The rolled back state matches the initial state exactly
      expect(rolledBackPhases).toEqual(initialPhases);
    });
  });
});
