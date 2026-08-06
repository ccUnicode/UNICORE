import { QueryRunner } from 'typeorm';
import { CreateAuditEventsTable1787788800003 } from './1787788800003-CreateAuditEventsTable';

describe('CreateAuditEventsTable1787788800003', () => {
  it('creates the audit_events table and its indexes', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        executedQueries.push(normalizedSql);
        return Promise.resolve([]);
      }),
    } as unknown as QueryRunner;

    await new CreateAuditEventsTable1787788800003().up(queryRunner);

    expect(
      executedQueries.some((sql) =>
        sql.startsWith('CREATE TABLE IF NOT EXISTS audit_events'),
      ),
    ).toBe(true);
    expect(
      executedQueries.filter((sql) => sql.startsWith('CREATE INDEX')),
    ).toHaveLength(4);
  });

  it('drops audit_events table in down method', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        executedQueries.push(sql);
        return Promise.resolve([]);
      }),
    } as unknown as QueryRunner;

    await new CreateAuditEventsTable1787788800003().down(queryRunner);

    expect(executedQueries).toEqual(['DROP TABLE IF EXISTS audit_events;']);
  });
});
