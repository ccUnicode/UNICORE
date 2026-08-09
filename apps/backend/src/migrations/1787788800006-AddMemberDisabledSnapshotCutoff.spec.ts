/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import { AddMemberDisabledSnapshotCutoff1787788800006 } from './1787788800006-AddMemberDisabledSnapshotCutoff';

describe('AddMemberDisabledSnapshotCutoff1787788800006', () => {
  it('adds and backfills the disabled access snapshot', async () => {
    const queryRunner = {
      hasTable: jest.fn().mockResolvedValue(true),
      hasColumn: jest.fn().mockResolvedValue(false),
      addColumn: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    await new AddMemberDisabledSnapshotCutoff1787788800006().up(queryRunner);
    expect(queryRunner.addColumn).toHaveBeenCalledTimes(2);
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("event.action = 'deactivate'"),
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('disabled_access_snapshot = jsonb_build_object'),
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('chk_members_disabled_snapshot'),
    );
  });
});
