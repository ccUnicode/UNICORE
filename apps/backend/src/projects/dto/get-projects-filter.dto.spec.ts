import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';
import { GetProjectsFilterDto } from './get-projects-filter.dto';

describe('GetProjectsFilterDto', () => {
  it('transforms query filters', async () => {
    const dto = plainToInstance(GetProjectsFilterDto, {
      page: '2',
      limit: '25',
      areaId: '4',
      status: ProjectStatus.ACTIVE,
      labels: ' Backend,Priority ',
      search: '  portal  ',
      archived: 'true',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto).toEqual(
      expect.objectContaining({
        page: 2,
        limit: 25,
        areaId: 4,
        labels: ['Backend', 'Priority'],
        search: 'portal',
        archived: true,
      }),
    );
  });

  it('rejects invalid archived filters', async () => {
    const dto = plainToInstance(GetProjectsFilterDto, {
      archived: 'yes',
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'archived',
        }),
      ]),
    );
  });
});
