import { DataSource, EntityManager } from 'typeorm';
import { MemberAvailabilityService } from './member-availability.service';

describe('MemberAvailabilityService', () => {
  const query = jest.fn();
  const manager = { query } as unknown as EntityManager;
  const service = new MemberAvailabilityService({ manager } as DataSource);

  beforeEach(() => jest.clearAllMocks());

  it('counts todo and other unfinished tasks in active projects', async () => {
    query.mockResolvedValue(undefined);
    await service.refreshMembers([2, 2, 3]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("task.status::text <> 'done'"),
      [[2, 3]],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("project.status::text = 'active'"),
      [[2, 3]],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("<> 'disabled'"),
      [[2, 3]],
    );
  });

  it('does nothing without member ids', async () => {
    await service.refreshMembers([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('refreshes every member assigned in a project', async () => {
    query.mockResolvedValueOnce([{ memberId: '4' }, { memberId: 7 }]);
    query.mockResolvedValueOnce(undefined);
    await service.refreshProjectMembers(9);
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), [9]);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [[4, 7]]);
  });
});
