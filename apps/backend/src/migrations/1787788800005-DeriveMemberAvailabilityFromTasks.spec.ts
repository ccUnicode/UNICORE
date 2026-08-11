import { QueryRunner } from 'typeorm';
import { DeriveMemberAvailabilityFromTasks1787788800005 } from './1787788800005-DeriveMemberAvailabilityFromTasks';

describe('DeriveMemberAvailabilityFromTasks1787788800005', () => {
  it('backfills availability without changing disabled members', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce(undefined);
    const migration = new DeriveMemberAvailabilityFromTasks1787788800005();
    await migration.up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("task.status::text <> 'done'"),
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("<> 'disabled'"),
    );
  });

  it('skips fresh databases before synchronization', async () => {
    const query = jest.fn().mockResolvedValue([{ count: 0 }]);
    const migration = new DeriveMemberAvailabilityFromTasks1787788800005();
    await migration.up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
