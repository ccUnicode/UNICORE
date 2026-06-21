import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberActivityStatus } from './enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from './enums/member-availability-status.enum';
import { MemberStatus } from './enums/member-status.enum';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

const getMembersControllerMethod = (methodName: keyof MembersController) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    MembersController.prototype,
    methodName,
  );

  if (!descriptor) {
    throw new Error(`Missing MembersController method: ${String(methodName)}`);
  }

  return descriptor.value as object;
};

describe('MembersController', () => {
  let controller: MembersController;

  const mockMembersService = {
    create: jest.fn(),
    findAccessible: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    }).compile();

    controller = module.get<MembersController>(MembersController);
  });

  it('creates members through the service', async () => {
    const createdMember = {
      id: 1,
      institution: 'UNI',
      studentCode: '20230001',
      firstNames: 'Ana Lucia',
      lastNames: 'Rojas Perez',
      major: 'Ingenieria de Sistemas',
      birthDate: '2004-04-18',
      role: AreaRole.MIEMBRO,
      areaId: null,
      area: null,
      activityStatus: MemberActivityStatus.ACTIVE,
      availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      skills: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: MemberStatus.Available,
      memberships: [],
    } satisfies Member;

    const createMemberDto = {
      institution: 'UNI',
      studentCode: '20230001',
      firstNames: 'Ana Lucia',
      lastNames: 'Rojas Perez',
      major: 'Ingenieria de Sistemas',
      birthDate: '2004-04-18',
      role: AreaRole.MIEMBRO,
      skills: [],
    };

    mockMembersService.create.mockResolvedValue(createdMember);

    await expect(controller.create(createMemberDto)).resolves.toEqual(
      createdMember,
    );
    expect(mockMembersService.create).toHaveBeenCalledWith(createMemberDto);
  });

  it('lists members through the scoped service method', async () => {
    const accessActor = {
      role: AreaRole.DIRECTIVA_DE_AREA,
      areaId: '2',
    };
    const storedMembers: Member[] = [];
    const filterDto = { status: MemberAvailabilityStatus.AVAILABLE };

    mockMembersService.findAccessible.mockResolvedValue(storedMembers);

    await expect(controller.findAll(accessActor, filterDto)).resolves.toEqual(
      storedMembers,
    );
    expect(mockMembersService.findAccessible).toHaveBeenCalledWith(
      accessActor,
      filterDto,
    );
  });

  describe('access metadata', () => {
    it('uses RolesGuard at controller level', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MembersController,
      ) as Array<new (...args: unknown[]) => unknown>;

      expect(guards).toContain(RolesGuard);
    });

    it('guards member creation for Presidencia only', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getMembersControllerMethod('create')),
      ).toEqual([AreaRole.PRESIDENCIA]);
    });

    it('guards member listing for Presidencia and Directiva de Area', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getMembersControllerMethod('findAll')),
      ).toEqual([AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA]);
    });

    it('guards member updates for Presidencia only', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getMembersControllerMethod('update')),
      ).toEqual([AreaRole.PRESIDENCIA]);
    });
  });
});
