import { DataSource, EntityManager } from 'typeorm';
import { MemberActivityService } from './member-activity.service';

describe('MemberActivityService', () => {
  const query = jest.fn();
  const entityManager = { query } as unknown as EntityManager;
  const dataSource = { manager: entityManager } as DataSource;
  const service = new MemberActivityService(dataSource);

  beforeEach(() => {
    query.mockReset();
  });

  it('recalculates unique member IDs from active project task states', async () => {
    query.mockResolvedValue([]);

    await service.refreshMembers([3, 2, 3], entityManager);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "task.status::text IN ('in_progress', 'in_review')",
      ),
      [[3, 2]],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("project.status::text = 'active'"),
      [[3, 2]],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('project.is_archived = FALSE'),
      [[3, 2]],
    );
  });

  it('does not query when no valid member IDs are supplied', async () => {
    await service.refreshMembers([], entityManager);

    expect(query).not.toHaveBeenCalled();
  });

  it('refreshes every member assigned to tasks in a project', async () => {
    query
      .mockResolvedValueOnce([{ memberId: 4 }, { memberId: '7' }])
      .mockResolvedValueOnce([]);

    await service.refreshProjectMembers(10, entityManager);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE task.project_id = $1'),
      [10],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE members member'),
      [[4, 7]],
    );
  });
});
