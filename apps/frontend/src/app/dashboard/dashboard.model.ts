import { getJson } from "@/lib/auth-client";
import type {
  Member,
  PaginatedProjects,
  Project,
  View,
} from "./dashboard.types";

export const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "/unicore/nav-dashboard.svg" },
  { id: "areas", label: "Áreas", icon: "/unicore/nav-areas.svg" },
  { id: "members", label: "Miembros", icon: "/unicore/nav-members.svg" },
  { id: "projects", label: "Proyectos", icon: "/unicore/nav-projects.svg" },
  { id: "tasks", label: "Tareas", icon: "/unicore/nav-tasks.svg" },
  {
    id: "integrations",
    label: "Integraciones",
    icon: "/unicore/nav-integrations.svg",
  },
  { id: "audit", label: "Auditoría", icon: "/unicore/nav-audit.svg" },
  { id: "profile", label: "Perfil", icon: "/unicore/nav-profile.svg" },
];

export function canSeeNavItem(item: View, role?: string): boolean {
  const normalizedRole = role?.trim().toLowerCase();
  const canManagePeople =
    normalizedRole === "presidencia" || normalizedRole === "directiva_de_area";

  return !["areas", "members", "audit"].includes(item) || canManagePeople;
}

export function fullName(member: Member): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

export function getMemberAreaIds(member: Member): number[] {
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  member.memberships?.forEach((membership) => {
    if (typeof membership.areaId === "number") ids.add(membership.areaId);
  });
  return [...ids];
}

export function getAreasPath(role: string): string {
  return role === "presidencia" ? "/areas?includeArchived=true" : "/areas";
}

function normalizeProjectList(
  payload: PaginatedProjects | Project[],
): Project[] {
  return Array.isArray(payload) ? payload : payload.data;
}

export async function getAllProjects(accessToken: string): Promise<Project[]> {
  const firstPage = await getJson<PaginatedProjects | Project[]>(
    "/projects?page=1&limit=100",
    accessToken,
  );

  if (Array.isArray(firstPage)) return firstPage;

  const projects = [...firstPage.data];
  for (let page = 2; page <= firstPage.meta.lastPage; page += 1) {
    const payload = await getJson<PaginatedProjects | Project[]>(
      `/projects?page=${page}&limit=100`,
      accessToken,
    );
    projects.push(...normalizeProjectList(payload));
  }

  return projects;
}
