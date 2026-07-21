import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AreaRole } from '../common/enums/area-role.enum';
import { AreaService } from './area.service';
import { Area } from './entities/area.entity';

const createArea = (overrides: Partial<Area> = {}): Area => ({
  id: 1,
  name: 'Research',
  description: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [],
  ...overrides,
});

describe('AreaService', () => {
  let service: AreaService;
  let repository: typeof mockAreaRepository;

  const mockAreaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaService,
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepository,
        },
      ],
    }).compile();

    service = module.get<AreaService>(AreaService);
    repository = module.get(getRepositoryToken(Area));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists every area for Presidencia', async () => {
    const storedAreas: Area[] = [
      {
        id: 1,
        name: 'Tecnologia',
        description: 'Area tech',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [],
      },
    ];

    repository.find.mockResolvedValue(storedAreas);

    await expect(
      service.findAccessible({ role: AreaRole.PRESIDENCIA }),
    ).resolves.toEqual(storedAreas);
    expect(repository.find).toHaveBeenCalledWith({
      where: { isArchived: false },
      order: { name: 'ASC' },
    });
  });

  it('lists only the assigned area for Directiva de Area', async () => {
    const storedArea: Area = {
      id: 3,
      name: 'Diseno',
      description: 'Area de diseno',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [],
    };

    repository.findOne.mockResolvedValue(storedArea);

    await expect(
      service.findAccessible({
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: '3',
      }),
    ).resolves.toEqual([storedArea]);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 3, isArchived: false },
    });
  });

  it('propagates NotFoundException when Directiva de Area has no active area', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findAccessible({
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: '3',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 3, isArchived: false },
    });
  });

  it('rejects area listing for Miembro', async () => {
    await expect(
      service.findAccessible({
        role: AreaRole.MIEMBRO,
        projectIds: ['proj-1'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates an area when the requested name is available', async () => {
    const currentArea = createArea();
    const updatedArea = createArea({ name: 'Development' });

    mockAreaRepository.findOne
      .mockResolvedValueOnce(currentArea)
      .mockResolvedValueOnce(null);
    mockAreaRepository.save.mockResolvedValue(updatedArea);

    await expect(
      service.update(currentArea.id, { name: updatedArea.name }),
    ).resolves.toEqual(updatedArea);
    expect(mockAreaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: currentArea.id,
        name: updatedArea.name,
      }),
    );
  });

  it('raises a conflict when updating to another existing area name', async () => {
    const currentArea = createArea({ id: 1, name: 'Research' });
    const duplicateArea = createArea({ id: 2, name: 'Development' });

    mockAreaRepository.findOne
      .mockResolvedValueOnce(currentArea)
      .mockResolvedValueOnce(duplicateArea);

    await expect(
      service.update(currentArea.id, { name: duplicateArea.name }),
    ).rejects.toMatchObject({
      message: `Area with name "${duplicateArea.name}" already exists`,
    });
    expect(mockAreaRepository.save).not.toHaveBeenCalled();
  });

  it('permanently deletes an area when confirmName exactly matches', async () => {
    const area = createArea();
    repository.findOne.mockResolvedValue(area);
    repository.remove.mockResolvedValue(area);

    await expect(service.remove(area.id, area.name)).resolves.toEqual(area);
    expect(repository.remove).toHaveBeenCalledWith(area);
  });

  it('rejects area deletion when confirmName does not exactly match', async () => {
    const area = createArea();
    repository.findOne.mockResolvedValue(area);

    await expect(service.remove(area.id, 'research')).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
