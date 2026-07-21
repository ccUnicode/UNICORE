import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ACCESS_SCOPE_KEY } from '../common/decorators/access-scope.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AreaController } from './area.controller';
import { AreaService } from './area.service';

const getAreaControllerMethod = (methodName: keyof AreaController) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    AreaController.prototype,
    methodName,
  );

  if (!descriptor) {
    throw new Error(`Missing AreaController method: ${String(methodName)}`);
  }

  return descriptor.value as object;
};

describe('AreaController', () => {
  let controller: AreaController;

  const mockAreaService = {
    create: jest.fn(),
    findAccessible: jest.fn(),
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
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
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
      const accessActor = {
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: '1',
      };
      mockAreaService.findAccessible.mockResolvedValue(expectedResult as any);

      const result = await controller.findAll(accessActor);
      expect(result).toEqual(expectedResult);
      expect(mockAreaService.findAccessible).toHaveBeenCalledWith(accessActor);
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

  describe('access metadata', () => {
    it('uses RolesGuard at controller level', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AreaController,
      ) as Array<new (...args: unknown[]) => unknown>;

      expect(guards).toContain(RolesGuard);
    });

    it('guards write actions for Presidencia only', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getAreaControllerMethod('create')),
      ).toEqual([AreaRole.PRESIDENCIA]);
      expect(
        Reflect.getMetadata(ROLES_KEY, getAreaControllerMethod('update')),
      ).toEqual([AreaRole.PRESIDENCIA]);
      expect(
        Reflect.getMetadata(ROLES_KEY, getAreaControllerMethod('archive')),
      ).toEqual([AreaRole.PRESIDENCIA]);
    });

    it('allows read access for Presidencia and Directiva de Area', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getAreaControllerMethod('findAll')),
      ).toEqual([AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA]);
      expect(
        Reflect.getMetadata(ROLES_KEY, getAreaControllerMethod('findOne')),
      ).toEqual([AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA]);
    });

    it('declares area-scoped enforcement for findOne', () => {
      expect(
        Reflect.getMetadata(
          ACCESS_SCOPE_KEY,
          getAreaControllerMethod('findOne'),
        ),
      ).toEqual({ areaIdParam: 'id' });
    });
  });
});
