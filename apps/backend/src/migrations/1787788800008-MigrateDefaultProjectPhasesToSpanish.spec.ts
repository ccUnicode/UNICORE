/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import {
  DEFAULT_PHASE_TRANSLATIONS,
  MigrateDefaultProjectPhasesToSpanish1787788800008,
  REVERSE_DEFAULT_PHASE_TRANSLATIONS,
  reverseTranslatePhaseName,
  translatePhaseName,
} from './1787788800008-MigrateDefaultProjectPhasesToSpanish';

describe('MigrateDefaultProjectPhasesToSpanish1787788800008', () => {
  describe('up', () => {
    it('migrates exact English phase names to Spanish when table exists', async () => {
      const queries: string[] = [];
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(true),
        query: jest.fn((sql: string) => {
          queries.push(sql.replace(/\s+/g, ' ').trim());
          return Promise.resolve([]);
        }),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800008();
      await migration.up(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
      expect(queries[0]).toContain('UPDATE project_phases');
      expect(queries[0]).toContain(
        "WHEN name = 'Planning' THEN 'Planificación'",
      );
      expect(queries[0]).toContain("WHEN name = 'Execution' THEN 'Ejecución'");
      expect(queries[0]).toContain("WHEN name = 'Review' THEN 'Revisión'");
      expect(queries[0]).toContain("WHEN name = 'Launch' THEN 'Lanzamiento'");
      expect(queries[0]).toContain(
        "WHERE name IN ('Planning', 'Execution', 'Review', 'Launch')",
      );
    });

    it('skips execution when project_phases table does not exist', async () => {
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(false),
        query: jest.fn().mockResolvedValue([]),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800008();
      await migration.up(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).not.toHaveBeenCalled();
    });
  });

  describe('down', () => {
    it('reverts Spanish phase names back to English on rollback', async () => {
      const queries: string[] = [];
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(true),
        query: jest.fn((sql: string) => {
          queries.push(sql.replace(/\s+/g, ' ').trim());
          return Promise.resolve([]);
        }),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800008();
      await migration.down(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
      expect(queries[0]).toContain('UPDATE project_phases');
      expect(queries[0]).toContain(
        "WHEN name = 'Planificación' THEN 'Planning'",
      );
      expect(queries[0]).toContain("WHEN name = 'Ejecución' THEN 'Execution'");
      expect(queries[0]).toContain("WHEN name = 'Revisión' THEN 'Review'");
      expect(queries[0]).toContain("WHEN name = 'Lanzamiento' THEN 'Launch'");
      expect(queries[0]).toContain(
        "WHERE name IN ('Planificación', 'Ejecución', 'Revisión', 'Lanzamiento')",
      );
    });

    it('skips rollback when project_phases table does not exist', async () => {
      const queryRunner = {
        hasTable: jest.fn().mockResolvedValue(false),
        query: jest.fn().mockResolvedValue([]),
      } as unknown as QueryRunner;

      const migration = new MigrateDefaultProjectPhasesToSpanish1787788800008();
      await migration.down(queryRunner);

      expect(queryRunner.hasTable).toHaveBeenCalledWith('project_phases');
      expect(queryRunner.query).not.toHaveBeenCalled();
    });
  });

  describe('renaming rules', () => {
    it('defines the 4 required English to Spanish mappings in order', () => {
      expect(DEFAULT_PHASE_TRANSLATIONS).toEqual({
        Planning: 'Planificación',
        Execution: 'Ejecución',
        Review: 'Revisión',
        Launch: 'Lanzamiento',
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

    it('translates exact English default phase names', () => {
      expect(translatePhaseName('Planning')).toBe('Planificación');
      expect(translatePhaseName('Execution')).toBe('Ejecución');
      expect(translatePhaseName('Review')).toBe('Revisión');
      expect(translatePhaseName('Launch')).toBe('Lanzamiento');
    });

    it('leaves custom or renamed phase names untouched', () => {
      expect(translatePhaseName('Validación con cliente')).toBe(
        'Validación con cliente',
      );
      expect(translatePhaseName('QA')).toBe('QA');
      expect(translatePhaseName('Pruebas de aceptación')).toBe(
        'Pruebas de aceptación',
      );
      expect(translatePhaseName('Diseño UI')).toBe('Diseño UI');
      expect(translatePhaseName('Custom phase')).toBe('Custom phase');
    });

    it('leaves already translated Spanish phase names untouched', () => {
      expect(translatePhaseName('Planificación')).toBe('Planificación');
      expect(translatePhaseName('Ejecución')).toBe('Ejecución');
      expect(translatePhaseName('Revisión')).toBe('Revisión');
      expect(translatePhaseName('Lanzamiento')).toBe('Lanzamiento');
    });

    it('migrates a set of phase records, preserving custom phases', () => {
      const projectPhases = [
        { id: 1, name: 'Planning', orderIndex: 1, projectId: 10 },
        { id: 2, name: 'Execution', orderIndex: 2, projectId: 10 },
        { id: 3, name: 'Validación con cliente', orderIndex: 3, projectId: 10 },
        { id: 4, name: 'Review', orderIndex: 4, projectId: 10 },
        { id: 5, name: 'QA Interno', orderIndex: 5, projectId: 10 },
        { id: 6, name: 'Launch', orderIndex: 6, projectId: 10 },
      ];

      const migrated = projectPhases.map((phase) => ({
        ...phase,
        name: translatePhaseName(phase.name),
      }));

      expect(migrated).toEqual([
        { id: 1, name: 'Planificación', orderIndex: 1, projectId: 10 },
        { id: 2, name: 'Ejecución', orderIndex: 2, projectId: 10 },
        { id: 3, name: 'Validación con cliente', orderIndex: 3, projectId: 10 },
        { id: 4, name: 'Revisión', orderIndex: 4, projectId: 10 },
        { id: 5, name: 'QA Interno', orderIndex: 5, projectId: 10 },
        { id: 6, name: 'Lanzamiento', orderIndex: 6, projectId: 10 },
      ]);
    });

    it('reverses a set of phase records on rollback, preserving custom phases', () => {
      const projectPhases = [
        { id: 1, name: 'Planificación', orderIndex: 1, projectId: 10 },
        { id: 2, name: 'Ejecución', orderIndex: 2, projectId: 10 },
        { id: 3, name: 'Validación con cliente', orderIndex: 3, projectId: 10 },
        { id: 4, name: 'Revisión', orderIndex: 4, projectId: 10 },
        { id: 5, name: 'QA Interno', orderIndex: 5, projectId: 10 },
        { id: 6, name: 'Lanzamiento', orderIndex: 6, projectId: 10 },
      ];

      const rolledBack = projectPhases.map((phase) => ({
        ...phase,
        name: reverseTranslatePhaseName(phase.name),
      }));

      expect(rolledBack).toEqual([
        { id: 1, name: 'Planning', orderIndex: 1, projectId: 10 },
        { id: 2, name: 'Execution', orderIndex: 2, projectId: 10 },
        { id: 3, name: 'Validación con cliente', orderIndex: 3, projectId: 10 },
        { id: 4, name: 'Review', orderIndex: 4, projectId: 10 },
        { id: 5, name: 'QA Interno', orderIndex: 5, projectId: 10 },
        { id: 6, name: 'Launch', orderIndex: 6, projectId: 10 },
      ]);
    });
  });
});
