import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AreaRole } from '../../common/enums/area-role.enum';
import { CreateMemberDto } from './create-member.dto';

describe('CreateMemberDto', () => {
  const validMember = {
    institution: 'UNI',
    studentCode: '20230001',
    firstNames: 'Ana Lucia',
    lastNames: 'Rojas Perez',
    major: 'Ingenieria de Sistemas',
    birthDate: '2004-04-18',
    skills: ['typescript'],
  };

  const validateDto = (payload: Record<string, unknown>) =>
    validate(plainToInstance(CreateMemberDto, payload));

  it('allows Directiva de Area with an areaId', async () => {
    await expect(
      validateDto({
        ...validMember,
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: 3,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects Directiva de Area without an areaId', async () => {
    const errors = await validateDto({
      ...validMember,
      role: AreaRole.DIRECTIVA_DE_AREA,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'areaId',
        }),
      ]),
    );
  });

  it('rejects Miembro with an areaId', async () => {
    const errors = await validateDto({
      ...validMember,
      role: AreaRole.MIEMBRO,
      areaId: 3,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'areaId',
        }),
      ]),
    );
  });
});
