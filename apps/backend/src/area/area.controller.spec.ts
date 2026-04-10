import { Test, TestingModule } from '@nestjs/testing';
import { AreaController } from './area.controller';
import { AreaService } from './area.service';

describe('AreaController', () => {
  let controller: AreaController;

  const mockAreaService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreaController],
      providers: [
        {
          provide: AreaService,
          useValue: mockAreaService,
        },
      ],
    }).compile();

    controller = module.get<AreaController>(AreaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an area', async () => {
      const createAreaDto = { name: 'Area 1' };
      const expectedResult = {
        id: 1,
        ...createAreaDto,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAreaService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createAreaDto);
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.create).toHaveBeenCalledWith(createAreaDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of areas', async () => {
      const expectedResult = [{ id: 1, name: 'Area 1' }];
      mockAreaService.findAll.mockResolvedValue(expectedResult as any);

      const result = await controller.findAll();
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an area', async () => {
      const expectedResult = { id: 1, name: 'Area 1' };
      mockAreaService.findOne.mockResolvedValue(expectedResult as any);

      const result = await controller.findOne(1);
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update an area', async () => {
      const updateAreaDto = { name: 'Area Updated' };
      const expectedResult = { id: 1, ...updateAreaDto };
      mockAreaService.update.mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, updateAreaDto);
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.update).toHaveBeenCalledWith(1, updateAreaDto);
    });
  });

  describe('archive', () => {
    it('should archive an area', async () => {
      const expectedResult = { id: 1, name: 'Area 1', isArchived: true };
      mockAreaService.archive.mockResolvedValue(expectedResult as any);

      const result = await controller.archive(1);
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.archive).toHaveBeenCalledWith(1);
    });
  });
});
