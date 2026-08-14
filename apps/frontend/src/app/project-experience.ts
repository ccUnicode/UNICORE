export type ProjectExperienceSource = {
  labels?: Array<{ name: string }>;
  memberships?: Array<{ memberId: number }>;
};

export type CandidateFilterMember = {
  id: number;
  firstNames: string;
  lastNames: string;
  major: string;
  cycle?: number | null;
  activityStatus?: string;
  skills?: Array<{ name: string }>;
};

export type CandidateFilters = {
  query: string;
  skill: string;
  projectLabel: string;
  cycle: string;
  major: string;
};

export function combineProjectExperience<T>(
  activeProjects: T[],
  archivedProjects: T[],
): T[] {
  return [...activeProjects, ...archivedProjects];
}

export function normalizeCandidateFilter(value: string): string {
  return normalizeText(value);
}

export function filterAndSortProjectCandidates<T extends CandidateFilterMember>(
  members: T[],
  projects: ProjectExperienceSource[],
  filters: CandidateFilters,
): T[] {
  const normalizedQuery = normalizeCandidateFilter(filters.query);
  const normalizedSkill = normalizeCandidateFilter(filters.skill);
  const normalizedLabel = normalizeCandidateFilter(filters.projectLabel);
  const normalizedMajor = normalizeCandidateFilter(filters.major);

  return members
    .filter((member) => {
      const searchableProfile = normalizeCandidateFilter(
        `${member.firstNames} ${member.lastNames} ${member.major}`,
      );
      const skills =
        member.skills?.map(({ name }) => normalizeCandidateFilter(name)) ?? [];
      const labels = getMemberProjectLabelNames(projects, member.id).map(
        normalizeCandidateFilter,
      );

      return (
        (!normalizedQuery || searchableProfile.includes(normalizedQuery)) &&
        (!normalizedSkill || skills.includes(normalizedSkill)) &&
        (!normalizedLabel || labels.includes(normalizedLabel)) &&
        (!filters.cycle || member.cycle === Number(filters.cycle)) &&
        (!normalizedMajor ||
          normalizeCandidateFilter(member.major) === normalizedMajor)
      );
    })
    .sort((left, right) => {
      const activityOrder =
        Number(left.activityStatus === "inactive") -
        Number(right.activityStatus === "inactive");
      const leftName = `${left.firstNames} ${left.lastNames}`.trim();
      const rightName = `${right.firstNames} ${right.lastNames}`.trim();
      return activityOrder || leftName.localeCompare(rightName);
    });
}

export function getPortfolioLabelNames(
  projects: ProjectExperienceSource[],
): string[] {
  return uniqueDisplayValues(
    projects.flatMap(
      (project) => project.labels?.map((label) => label.name) ?? [],
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function getMemberProjectLabelNames(
  projects: ProjectExperienceSource[],
  memberId: number,
): string[] {
  return projects
    .filter((project) =>
      project.memberships?.some(
        (membership) => membership.memberId === memberId,
      ),
    )
    .flatMap(
      (project) => project.labels?.map((label) => label.name) ?? [],
    );
}
import { normalizeText, uniqueDisplayValues } from "./text-normalization";
