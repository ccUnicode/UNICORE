import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

const validProjectPayload = {
  name: 'Portal de miembros',
  description: 'Proyecto base para miembros',
  startDate: '2026-06-01',
  endDate: '2026-07-01',
  areaId: 1,
};

describe('CreateProjectDto', () => {
  it('trims string fields and accepts a valid project payload', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validProjectPayload,
      name: '  Portal de miembros  ',
      description: '  Proyecto base  ',
      areaId: '2',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Portal de miembros');
    expect(dto.description).toBe('Proyecto base');
    expect(dto.areaId).toBe(2);
  });

  it('rejects an empty name', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validProjectPayload,
      name: '   ',
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'name',
        }),
      ]),
    );
  });

  it('rejects a description longer than the configured limit', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validProjectPayload,
      description: 'a'.repeat(2001),
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'description',
        }),
      ]),
    );
  });

  it('rejects non-positive area ids', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validProjectPayload,
      areaId: 0,
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'areaId',
        }),
      ]),
    );
  });
});
