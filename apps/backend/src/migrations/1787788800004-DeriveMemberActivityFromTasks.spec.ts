import { DeriveMemberActivityFromTasks1787788800004 } from './1787788800004-DeriveMemberActivityFromTasks';

describe('DeriveMemberActivityFromTasks1787788800004', () => {
  it('sets the inactive default and backfills activity from active projects', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
        if (sql.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ count: 4 }]);
        }
        return Promise.resolve([]);
      }),
    };

    await new DeriveMemberActivityFromTasks1787788800004().up(
      queryRunner as never,
    );

    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SET DEFAULT 'inactive'"),
        expect.stringContaining(
          "task.status::text IN ('in_progress', 'in_review')",
        ),
        expect.stringContaining("project.status::text = 'active'"),
        expect.stringContaining('project.is_archived = FALSE'),
      ]),
    );
  });

  it('leaves fresh databases for TypeORM synchronization', async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValue([{ count: 0 }]),
    };

    await new DeriveMemberActivityFromTasks1787788800004().up(
      queryRunner as never,
    );

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
  });
});
