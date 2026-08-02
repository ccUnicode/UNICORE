import { QueryRunner } from 'typeorm';
import { MigrateMemberRolesAndAreas1787788800000 } from './1787788800000-MigrateMemberRolesAndAreas';

describe('MigrateMemberRolesAndAreas1787788800000', () => {
  it('prepares defaults and nullable area memberships before converting data', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        executedQueries.push(normalizedSql);

        if (
          normalizedSql.includes('information_schema.tables') &&
          normalizedSql.includes("table_name='members'")
        ) {
          return Promise.resolve([{ exists: true }]);
        }
        if (
          normalizedSql.includes('information_schema.columns') &&
          normalizedSql.includes("column_name='availability_status'")
        ) {
          return Promise.resolve([{ exists: true }]);
        }
        if (
          normalizedSql.includes('information_schema.columns') &&
          normalizedSql.includes("column_name='role'")
        ) {
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
    const dropDefaultIndex = executedQueries.findIndex((sql) =>
      sql.includes(
        'ALTER TABLE members ALTER COLUMN availability_status DROP DEFAULT',
      ),
    );
    const enumConversionIndex = executedQueries.findIndex((sql) =>
      sql.includes(
        'ALTER TABLE members ALTER COLUMN availability_status TYPE members_availability_status_enum',
      ),
    );
    const restoreDefaultIndex = executedQueries.findIndex((sql) =>
      sql.includes(
        "ALTER TABLE members ALTER COLUMN availability_status SET DEFAULT 'available'::members_availability_status_enum",
      ),
    );

    expect(nullableAreaIndex).toBeGreaterThanOrEqual(0);
    expect(nullableAreaIndex).toBeLessThan(membershipInsertIndex);
    expect(dropDefaultIndex).toBeGreaterThanOrEqual(0);
    expect(dropDefaultIndex).toBeLessThan(enumConversionIndex);
    expect(restoreDefaultIndex).toBeGreaterThan(enumConversionIndex);
  });
});
