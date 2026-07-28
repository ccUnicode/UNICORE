import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { Member } from '../members/member.entity';
import { AreaMembershipsService } from './area-memberships.service';
import { AreaMembership } from './entities/area-membership.entity';

describe('AreaMembershipsService', () => {
  let service: AreaMembershipsService;

  const areaMembershipsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const areasRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaMembershipsService,
        {
          provide: getRepositoryToken(AreaMembership),
          useValue: areaMembershipsRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: areasRepository,
        },
      ],
    }).compile();

    service = module.get(AreaMembershipsService);
  });

  it('creates a membership in an active area', async () => {
    const member = { id: 1 } as Member;
    const area = { id: 2, isArchived: false } as Area;
    const membership = { id: 3, member, area } as AreaMembership;
    const createDto = {
      memberId: member.id,
      areaId: area.id,
      role: AreaRole.MIEMBRO,
    };

    membersRepository.findOne.mockResolvedValue(member);
    areasRepository.findOne.mockResolvedValue(area);
    areaMembershipsRepository.create.mockReturnValue(membership);
    areaMembershipsRepository.save.mockResolvedValue(membership);

    await expect(service.create(createDto)).resolves.toEqual(membership);
    expect(areasRepository.findOne).toHaveBeenCalledWith({
      where: { id: area.id, isArchived: false },
    });
  });

  it('rejects a membership in an archived area', async () => {
    const member = { id: 1 } as Member;

    membersRepository.findOne.mockResolvedValue(member);
    areasRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        memberId: member.id,
        areaId: 2,
        role: AreaRole.MIEMBRO,
      }),
    ).rejects.toThrow(new NotFoundException('Area with ID 2 not found'));
    expect(areasRepository.findOne).toHaveBeenCalledWith({
      where: { id: 2, isArchived: false },
    });
    expect(areaMembershipsRepository.create).not.toHaveBeenCalled();
  });
});
