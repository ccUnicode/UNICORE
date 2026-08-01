import { AreaRole } from '../../common/enums/area-role.enum';
import { MemberResponse } from '../dto/member-response.dto';
import { Member } from '../member.entity';

export const canViewInternalMemberFields = (role: AreaRole): boolean =>
  role === AreaRole.PRESIDENCIA || role === AreaRole.DIRECTIVA_DE_AREA;

export const toMemberResponse = (
  member: Member,
  role: AreaRole,
): MemberResponse => {
  const response: MemberResponse = {
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
  };

  if (canViewInternalMemberFields(role)) {
    response.activityStatus = member.activityStatus;
    response.availabilityStatus = member.availabilityStatus;
  }

  return response;
};
