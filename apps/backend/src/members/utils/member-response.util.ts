import { AreaRole } from '../../common/enums/area-role.enum';
import { MemberResponse } from '../dto/member-response.dto';
import { Member } from '../member.entity';
import { MemberAvailabilityStatus } from '../enums/member-availability-status.enum';

export const canViewInternalMemberFields = (role: AreaRole): boolean =>
  role === AreaRole.PRESIDENCIA || role === AreaRole.DIRECTIVA_DE_AREA;

export const toMemberResponse = (
  member: Member,
  role: AreaRole,
): MemberResponse => {
  const disabledSnapshot = member.disabledAccessSnapshot;
  const isDisabled =
    member.availabilityStatus === MemberAvailabilityStatus.DISABLED;
  const effectiveRole =
    isDisabled && disabledSnapshot ? disabledSnapshot.role : member.role;
  const effectiveAreaId =
    isDisabled && disabledSnapshot ? disabledSnapshot.areaId : member.areaId;
  const disabledAt = member.disabledAt;
  const visibleMemberships =
    isDisabled && disabledAt
      ? (member.memberships ?? []).filter(
          (membership) =>
            membership.areaId === effectiveAreaId &&
            membership.createdAt <= disabledAt &&
            membership.updatedAt <= disabledAt,
        )
      : (member.memberships ?? []);
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
    role: effectiveRole,
    areaId: effectiveAreaId,
    memberships: visibleMemberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      memberId: membership.memberId,
      areaId: membership.areaId,
      area: membership.area,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    })),
  };

  if (isDisabled) {
    response.disabledAt = member.disabledAt ?? null;
    response.readOnly = true;
  }

  if (canViewInternalMemberFields(role)) {
    response.activityStatus = member.activityStatus;
    response.availabilityStatus = member.availabilityStatus;
  }

  return response;
};
