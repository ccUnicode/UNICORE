import { AreaMembership } from '../../area-memberships/entities/area-membership.entity';
import { Member } from '../member.entity';

type InternalMemberField = 'activityStatus' | 'availabilityStatus';
type MemberMembershipResponse = Omit<AreaMembership, 'member'>;

export type MemberResponse = Omit<Member, InternalMemberField | 'memberships'> &
  Partial<Pick<Member, InternalMemberField>> & {
    memberships: MemberMembershipResponse[];
  };
