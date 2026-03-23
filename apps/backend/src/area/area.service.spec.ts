import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AreaService } from './area.service';
import { Area } from './entities/area.entity';

describe('AreaService', () => {
  let service: AreaService;

  const mockAreaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
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
});
