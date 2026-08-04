export type ManagedArea = {
  id: number;
  name: string;
  description: string | null;
  isArchived?: boolean;
};

export type ManagedSkill = { id?: number; name: string };

export type ManagedAreaMembership = {
  id?: number;
  areaId: number | null;
  role?: string;
  area?: ManagedArea;
};

export type ManagedMember = {
  id: number;
  firstNames: string;
  lastNames: string;
  institution?: string;
  studentCode?: string | null;
  major: string;
  birthDate?: string | null;
  cycle?: number | null;
  role: string;
  areaId?: number | null;
  area?: ManagedArea | null;
  activityStatus?: string;
  availabilityStatus?: string;
  skills?: ManagedSkill[];
  memberships?: ManagedAreaMembership[];
};

export type ManagedProject = {
  id: number;
  name: string;
  description: string | null;
  areaId?: number;
  area?: ManagedArea | null;
  labels?: Array<{ id?: number; name: string }>;
  memberships?: Array<{ memberId: number; role?: string }>;
  status?: string;
  isArchived?: boolean;
};

export type AreaMetric = {
  area: ManagedArea;
  memberCount: number;
  projectCount: number;
  members: ManagedMember[];
  projects: ManagedProject[];
};
