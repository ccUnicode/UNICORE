import { AreaRole } from '../../common/enums/area-role.enum';
import { MemberResponse } from '../dto/member-response.dto';
import { Member } from '../member.entity';

const INTERNAL_MEMBER_FIELDS = [
  'activityStatus',
  'availabilityStatus',
] as const;

export const canViewInternalMemberFields = (role: AreaRole): boolean =>
  role === AreaRole.PRESIDENCIA || role === AreaRole.DIRECTIVA_DE_AREA;

export const toMemberResponse = (
  member: Member,
  role: AreaRole,
): MemberResponse => {
  if (canViewInternalMemberFields(role)) {
    return member;
  }

  const response: MemberResponse = { ...member };

  for (const field of INTERNAL_MEMBER_FIELDS) {
    delete response[field];
  }

  return response;
};
