export type ProjectExperienceSource = {
  labels?: Array<{ name: string }>;
  memberships?: Array<{ memberId: number }>;
};

export function combineProjectExperience<T>(
  activeProjects: T[],
  archivedProjects: T[],
): T[] {
  return [...activeProjects, ...archivedProjects];
}

export function getPortfolioLabelNames(
  projects: ProjectExperienceSource[],
): string[] {
  return Array.from(
    new Set(
      projects.flatMap(
        (project) => project.labels?.map((label) => label.name) ?? [],
      ),
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
