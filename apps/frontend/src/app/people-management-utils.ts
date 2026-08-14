import { normalizeText, uniqueDisplayValues } from "./text-normalization";

export type MemberDirectoryItem = {
  id: number;
  firstNames: string;
  lastNames: string;
  major: string;
  cycle?: number | null;
  activityStatus?: string;
  availabilityStatus?: string;
  skills?: Array<{ name: string }>;
  memberships?: Array<{ areaId: number | null }>;
};

export type MemberDirectoryFilters = {
  query: string;
  activity: string;
  availability: string;
  areaId: string;
  cycle: string;
  career: string;
  projectLabel: string;
};

export type ProjectDirectoryItem = {
  labels?: Array<{ name: string }>;
  memberships?: Array<{ memberId: number }>;
};

export function canCreateMemberInArea(
  role: string,
  actorAreaId: number | null | undefined,
  targetAreaId: number,
  isArchived = false,
): boolean {
  if (isArchived) return false;

  return (
    role === "presidencia" ||
    (role === "directiva_de_area" && actorAreaId === targetAreaId)
  );
}

export function getProjectLabelsForMember(
  memberId: number,
  projects: ProjectDirectoryItem[],
): string[] {
  return uniqueDisplayValues(
    projects
        .filter((project) =>
          project.memberships?.some(
            (membership) => membership.memberId === memberId,
          ),
        )
      .flatMap((project) => project.labels?.map((label) => label.name) ?? []),
  );
}

export function filterAndSortMembers<T extends MemberDirectoryItem>(
  members: T[],
  projects: ProjectDirectoryItem[],
  filters: MemberDirectoryFilters,
): T[] {
  const query = normalizeText(filters.query);
  const career = normalizeText(filters.career);
  const projectLabel = normalizeText(filters.projectLabel);

  return members
    .filter((member) => {
      const memberAreaIds =
        member.memberships
          ?.map((membership) => membership.areaId)
          .filter((areaId): areaId is number => typeof areaId === "number") ??
        [];
      const searchable = normalizeText(
        [
          member.firstNames,
          member.lastNames,
          member.major,
          ...(member.skills?.map((skill) => skill.name) ?? []),
        ].join(" "),
      );
      const labels = getProjectLabelsForMember(member.id, projects).map(
        normalizeText,
      );

      return (
        (!query || searchable.includes(query)) &&
        (!filters.activity || member.activityStatus === filters.activity) &&
        (!filters.availability ||
          member.availabilityStatus === filters.availability) &&
        (!filters.areaId || memberAreaIds.includes(Number(filters.areaId))) &&
        (!filters.cycle || member.cycle === Number(filters.cycle)) &&
        (!career || normalizeText(member.major) === career) &&
        (!projectLabel || labels.includes(projectLabel))
      );
    })
    .sort((left, right) => {
      const leftInactive = left.activityStatus === "inactive" ? 1 : 0;
      const rightInactive = right.activityStatus === "inactive" ? 1 : 0;
      if (leftInactive !== rightInactive) return leftInactive - rightInactive;
      return `${left.firstNames} ${left.lastNames}`.localeCompare(
        `${right.firstNames} ${right.lastNames}`,
        "es",
      );
    });
}
