import { AreaRole } from '../../common/enums/area-role.enum';
import { MemberActivityStatus } from '../enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
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
  role: AreaRole.MIEMBRO,
  areaId: 3,
  area: null,
  activityStatus: MemberActivityStatus.ACTIVE,
  availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
  status: MemberStatus.Available,
  skills: [],
  memberships: [],
  projectMemberships: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('toMemberResponse', () => {
  it.each([AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA])(
    'keeps internal member fields for %s',
    (role) => {
      expect(toMemberResponse(member, role)).toEqual(member);
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
    });
  });
});
