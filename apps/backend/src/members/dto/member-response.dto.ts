import { Member } from '../member.entity';

type InternalMemberField = 'activityStatus' | 'availabilityStatus';

export type MemberResponse = Omit<Member, InternalMemberField> &
  Partial<Pick<Member, InternalMemberField>>;
