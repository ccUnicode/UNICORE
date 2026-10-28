/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import { MigrateDefaultProjectPhasesToSpanish1787788800009 } from './1787788800009-MigrateDefaultProjectPhasesToSpanish';

describe('MigrateDefaultProjectPhasesToSpanish1787788800009', () => {
  it('skips an absent phases table', async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(false),
      query: jest.fn(),
    } as unknown as QueryRunner;
    await new MigrateDefaultProjectPhasesToSpanish1787788800009().up(runner);
    expect(runner.query).not.toHaveBeenCalled();
  });
  it('does not roll back without migration tracking', async () => {
    const runner = {
      hasTable: jest
        .fn()
        .mockImplementation((table: string) =>
          Promise.resolve(table === 'project_phases'),
        ),
      query: jest.fn(),
    } as unknown as QueryRunner;
    await new MigrateDefaultProjectPhasesToSpanish1787788800009().down(runner);
    expect(runner.query).not.toHaveBeenCalled();
  });
});
