import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ProjectStatus } from '../enums/project-status.enum';
import { UpdateProjectDto } from './update-project.dto';

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateProjectDto,
};

describe('UpdateProjectDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
  });

  it('validates, transforms, and preserves partial project updates', async () => {
    const result = (await validationPipe.transform(
      {
        name: '  Portal actualizado  ',
        status: ProjectStatus.ACTIVE,
        labels: ['  Backend  '],
        links: [
          {
            name: '  Repository  ',
            url: '  https://github.com/ccUnicode/UNICORE  ',
          },
        ],
      },
      bodyMetadata,
    )) as unknown;

    expect(result).toEqual(
      expect.objectContaining({
        name: 'Portal actualizado',
        status: ProjectStatus.ACTIVE,
        labels: ['Backend'],
        links: [
          {
            name: 'Repository',
            url: 'https://github.com/ccUnicode/UNICORE',
          },
        ],
      }),
    );
  });

  it('allows nullable fields to be cleared', async () => {
    await expect(
      validationPipe.transform(
        { description: null, startDate: null, endDate: null },
        bodyMetadata,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        description: null,
        startDate: null,
        endDate: null,
      }),
    );
  });

  it.each(['name', 'areaId', 'status', 'labels', 'links'])(
    'rejects null for %s',
    async (property) => {
      await expect(
        validationPipe.transform({ [property]: null }, bodyMetadata),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});
