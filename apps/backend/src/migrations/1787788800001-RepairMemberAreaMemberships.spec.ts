import { QueryRunner } from 'typeorm';
import { RepairMemberAreaMemberships1787788800001 } from './1787788800001-RepairMemberAreaMemberships';

describe('RepairMemberAreaMemberships1787788800001', () => {
  it('repairs existing constraints and can run repeatedly', async () => {
    const executedQueries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        executedQueries.push(normalizedSql);

        if (normalizedSql.startsWith('SELECT EXISTS')) {
          return Promise.resolve([{ exists: true }]);
        }

        return Promise.resolve([]);
      }),
    } as unknown as QueryRunner;
    const migration = new RepairMemberAreaMemberships1787788800001();

    await migration.up(queryRunner);
    await migration.up(queryRunner);

    expect(
      executedQueries.filter((sql) =>
        sql.includes(
          'ALTER TABLE area_memberships ALTER COLUMN area_id DROP NOT NULL',
        ),
      ),
    ).toHaveLength(2);
    expect(
      executedQueries.filter((sql) =>
        sql.includes(
          "ALTER COLUMN availability_status SET DEFAULT 'available'::members_availability_status_enum",
        ),
      ),
    ).toHaveLength(2);
  });

  it('does nothing when the legacy tables or columns are absent', async () => {
    const query = jest.fn((sql: string) => {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      return Promise.resolve(
        normalizedSql.startsWith('SELECT EXISTS') ? [{ exists: false }] : [],
      );
    });
    const queryRunner = {
      query,
    } as unknown as QueryRunner;

    await new RepairMemberAreaMemberships1787788800001().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
  });
});
