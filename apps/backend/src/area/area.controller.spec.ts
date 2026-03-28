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
});
