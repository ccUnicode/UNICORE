import { AreaRole } from '../../common/enums/area-role.enum';
import { MemberActivityStatus } from '../enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';
import { Member } from '../member.entity';
import { toMemberResponse } from './member-response.util';

const member: Member = {
  id: 1,
  institution: 'UNI',
  studentCode: '20230001',
  firstNames: 'Ana Lucia',
  lastNames: 'Rojas Perez',
  major: 'Ingenieria de Sistemas',
  birthDate: '2004-04-18',
  cycle: null,
  activityStatus: MemberActivityStatus.ACTIVE,
  availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
  skills: [],
  memberships: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  get role(): AreaRole {
    return AreaRole.MIEMBRO;
  },
  get areaId(): number | null {
    return 3;
  },
};

describe('toMemberResponse', () => {
  it.each([AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA])(
    'keeps internal member fields for %s',
    (role) => {
      expect(toMemberResponse(member, role)).toEqual({
        id: member.id,
        institution: member.institution,
        studentCode: member.studentCode,
        firstNames: member.firstNames,
        lastNames: member.lastNames,
        major: member.major,
        birthDate: member.birthDate,
        cycle: member.cycle,
        skills: member.skills,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        role: member.role,
        areaId: member.areaId,
        memberships: member.memberships,
        activityStatus: member.activityStatus,
        availabilityStatus: member.availabilityStatus,
      });
    },
  );

  it('removes internal member fields for regular members', () => {
    const response = toMemberResponse(member, AreaRole.MIEMBRO);

    expect(response).not.toHaveProperty('activityStatus');
    expect(response).not.toHaveProperty('availabilityStatus');
    expect(response).toMatchObject({
      id: member.id,
      firstNames: member.firstNames,
      lastNames: member.lastNames,
      skills: member.skills,
      role: AreaRole.MIEMBRO,
      areaId: 3,
    });
  });
});
