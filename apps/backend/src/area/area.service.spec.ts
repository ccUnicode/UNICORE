import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AreaService } from './area.service';
import { Area } from './entities/area.entity';

const createArea = (overrides: Partial<Area> = {}): Area => ({
  id: 1,
  name: 'Research',
  description: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AreaService', () => {
  let service: AreaService;

  const mockAreaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
