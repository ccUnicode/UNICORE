import { QueryRunner } from 'typeorm';
import { MigrateMemberRolesAndAreas1787788800000 } from './1787788800000-MigrateMemberRolesAndAreas';

describe('MigrateMemberRolesAndAreas1787788800000', () => {
  it('makes area memberships nullable before migrating legacy members', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        executedQueries.push(normalizedSql);

        if (normalizedSql.startsWith('SELECT EXISTS')) {
          return Promise.resolve([{ exists: true }]);
        }
        if (normalizedSql.includes('SELECT COUNT(*) as count')) {
          return Promise.resolve([{ count: 0 }]);
        }

        return Promise.resolve([]);
      }),
    } as unknown as QueryRunner;

    await new MigrateMemberRolesAndAreas1787788800000().up(queryRunner);

    const nullableAreaIndex = executedQueries.findIndex((sql) =>
      sql.includes(
        'ALTER TABLE area_memberships ALTER COLUMN area_id DROP NOT NULL',
      ),
    );
    const membershipInsertIndex = executedQueries.findIndex((sql) =>
      sql.includes('INSERT INTO area_memberships'),
    );

    expect(nullableAreaIndex).toBeGreaterThanOrEqual(0);
    expect(nullableAreaIndex).toBeLessThan(membershipInsertIndex);
  });
});
