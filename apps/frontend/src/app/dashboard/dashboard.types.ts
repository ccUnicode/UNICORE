export type View =
  | "dashboard"
  | "areas"
  | "area-detail"
  | "members"
  | "member-profile"
  | "projects"
  | "tasks"
  | "integrations"
  | "audit"
  | "profile";

export type Area = {
  id: number;
  name: string;
  description: string | null;
  isArchived?: boolean;
};

export type Skill = { id?: number; name: string };

export type AreaMembership = {
  id?: number;
  areaId: number | null;
  role?: string;
  area?: Area;
};

export type Member = {
  id: number;
  firstNames: string;
  lastNames: string;
  institution?: string;
  studentCode?: string | null;
  major: string;
  cycle?: number | null;
  role: string;
  areaId?: number | null;
  area?: Area | null;
  activityStatus?: "active" | "inactive" | string;
  availabilityStatus?: "available" | "not_available" | string;
  skills?: Skill[];
  memberships?: AreaMembership[];
};

export type ProjectMembership = {
  id: number;
  role: "representative" | "subrepresentative" | "member";
  memberId: number;
  member?: Member;
};

export type ProjectPhase = {
  id: number;
  name: string;
  description?: string | null;
  orderIndex: number;
};

export type ProjectLabel = { id?: number; name: string };
export type ProjectLink = { id?: number; name: string; url: string };
export type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type Project = {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  areaId?: number;
  area?: Area | null;
  phases?: ProjectPhase[];
  memberships?: ProjectMembership[];
  labels?: ProjectLabel[];
  links?: ProjectLink[];
  status: ProjectStatus;
  isArchived: boolean;
  createdAt?: string;
};

export type PaginatedProjects = {
  data: Project[];
  meta: { total: number; page: number; limit: number; lastPage: number };
};

export type LoadState = "idle" | "loading" | "ready" | "error";
export type AuthState = "initializing" | "anonymous" | "authenticated";
