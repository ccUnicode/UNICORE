import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { Member } from '../members/member.entity';
import { AreaMembershipsService } from './area-memberships.service';
import { AreaMembership } from './entities/area-membership.entity';
import { ProjectMembership } from '../projects/entities/project-membership.entity';

describe('AreaMembershipsService', () => {
  let service: AreaMembershipsService;

  const areaMembershipsRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const areasRepository = {
    findOne: jest.fn(),
  };
  const projectMembershipsRepository = {
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
        {
          provide: getRepositoryToken(ProjectMembership),
          useValue: projectMembershipsRepository,
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

  it('updates the role and active area of a membership', async () => {
    const member = { id: 1 } as Member;
    const previousArea = { id: 2, isArchived: false } as Area;
    const nextArea = { id: 4, isArchived: false } as Area;
    const membership = {
      id: 3,
      memberId: member.id,
      areaId: previousArea.id,
      member,
      area: previousArea,
      role: AreaRole.MIEMBRO,
    } as AreaMembership;

    areaMembershipsRepository.findOne.mockResolvedValue(membership);
    projectMembershipsRepository.findOne.mockResolvedValue(null);
    areasRepository.findOne.mockResolvedValue(nextArea);
    areaMembershipsRepository.save.mockImplementation((value: AreaMembership) =>
      Promise.resolve(value),
    );

    await expect(
      service.update(membership.id, {
        areaId: nextArea.id,
        role: AreaRole.DIRECTIVA_DE_AREA,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        area: nextArea,
        role: AreaRole.DIRECTIVA_DE_AREA,
      }),
    );
    expect(areasRepository.findOne).toHaveBeenCalledWith({
      where: { id: nextArea.id, isArchived: false },
    });
  });

  it('removes an existing membership', async () => {
    const membership = {
      id: 3,
      memberId: 1,
      areaId: 2,
    } as AreaMembership;
    areaMembershipsRepository.findOne.mockResolvedValue(membership);
    projectMembershipsRepository.findOne.mockResolvedValue(null);
    areaMembershipsRepository.remove.mockResolvedValue(membership);

    await expect(service.remove(membership.id)).resolves.toEqual(membership);
    expect(areaMembershipsRepository.remove).toHaveBeenCalledWith(membership);
  });

  it('rejects removing a membership used by an active project team', async () => {
    const membership = {
      id: 3,
      memberId: 1,
      areaId: 2,
    } as AreaMembership;
    areaMembershipsRepository.findOne.mockResolvedValue(membership);
    projectMembershipsRepository.findOne.mockResolvedValue({ id: 8 });

    await expect(service.remove(membership.id)).rejects.toThrow(
      new BadRequestException(
        'Remove the member from active project teams in this area before changing or removing the area membership',
      ),
    );
    expect(areaMembershipsRepository.remove).not.toHaveBeenCalled();
  });
});
