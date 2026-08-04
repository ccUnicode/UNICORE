import { QueryRunner } from 'typeorm';
import { AddTaskCollaboration1787788800002 } from './1787788800002-AddTaskCollaboration';

describe('AddTaskCollaboration1787788800002', () => {
  it('creates both collaboration tables and their indexes', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        executedQueries.push(normalizedSql);
        return Promise.resolve(
          normalizedSql.startsWith('SELECT COUNT') ? [{ count: 2 }] : [],
        );
      }),
    } as unknown as QueryRunner;

    await new AddTaskCollaboration1787788800002().up(queryRunner);

    expect(
      executedQueries.some((sql) =>
        sql.startsWith('CREATE TABLE IF NOT EXISTS task_comments'),
      ),
    ).toBe(true);
    expect(
      executedQueries.some((sql) =>
        sql.startsWith('CREATE TABLE IF NOT EXISTS task_status_history'),
      ),
    ).toBe(true);
    expect(
      executedQueries.filter((sql) => sql.startsWith('CREATE INDEX')),
    ).toHaveLength(2);
  });

  it('lets schema synchronization handle a fresh database', async () => {
    const query = jest.fn((sql: string) =>
      Promise.resolve(sql.includes('SELECT COUNT') ? [{ count: 0 }] : []),
    );
    const queryRunner = { query } as unknown as QueryRunner;

    await new AddTaskCollaboration1787788800002().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(1);
  });
});
