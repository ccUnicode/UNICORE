/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import { AddMemberDisabledSnapshotCutoff1787788800006 } from './1787788800006-AddMemberDisabledSnapshotCutoff';

describe('AddMemberDisabledSnapshotCutoff1787788800006', () => {
  it('adds and backfills disabled_at', async () => {
    const queryRunner = {
      hasTable: jest.fn().mockResolvedValue(true),
      hasColumn: jest.fn().mockResolvedValue(false),
      addColumn: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    await new AddMemberDisabledSnapshotCutoff1787788800006().up(queryRunner);
    expect(queryRunner.addColumn).toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('SET disabled_at = updated_at'),
    );
  });
});
