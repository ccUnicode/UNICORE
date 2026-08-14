import type { View } from "./dashboard.types";

export type DashboardRoute = {
  view: View | "not-found";
  resourceId?: number;
};

const VIEW_PATHS: Record<
  Exclude<View, "area-detail" | "member-create" | "member-profile">,
  string
> = {
  dashboard: "/dashboard",
  areas: "/dashboard/areas",
  members: "/dashboard/members",
  projects: "/dashboard/projects",
  tasks: "/dashboard/tasks",
  integrations: "/dashboard/integrations",
  audit: "/dashboard/audit",
  profile: "/dashboard/profile",
};

function parsePositiveId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function parseDashboardPath(pathname: string): DashboardRoute {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  const staticRoute = Object.entries(VIEW_PATHS).find(
    ([, path]) => path === normalizedPath,
  );
  if (staticRoute) return { view: staticRoute[0] as View };

  const areaMatch = normalizedPath.match(/^\/dashboard\/areas\/([^/]+)$/);
  if (areaMatch) {
    const resourceId = parsePositiveId(areaMatch[1]);
    return resourceId
      ? { view: "area-detail", resourceId }
      : { view: "not-found" };
  }

  if (normalizedPath === "/dashboard/members/new") {
    return { view: "member-create" };
  }

  const memberMatch = normalizedPath.match(/^\/dashboard\/members\/([^/]+)$/);
  if (memberMatch) {
    const resourceId = parsePositiveId(memberMatch[1]);
    return resourceId
      ? { view: "member-profile", resourceId }
      : { view: "not-found" };
  }

  return { view: "not-found" };
}

export function getDashboardPath(view: View, resourceId?: number): string {
  if (view === "area-detail") {
    if (!resourceId)
      throw new Error("El detalle de área requiere un identificador");
    return `/dashboard/areas/${resourceId}`;
  }
  if (view === "member-profile") {
    if (!resourceId) throw new Error("El perfil de miembro requiere un identificador");
    return `/dashboard/members/${resourceId}`;
  }
  if (view === "member-create") return "/dashboard/members/new";
  return VIEW_PATHS[view];
}

export function getMemberCreationPath(areaId?: number): string {
  const path = getDashboardPath("member-create");
  return areaId ? `${path}?areaId=${areaId}` : path;
}

export function parseMemberCreationAreaId(
  value: string | null,
): number | undefined {
  return value === null ? undefined : parsePositiveId(value);
}

export function getRouteNavView(route: DashboardRoute): View | undefined {
  if (route.view === "area-detail") return "areas";
  if (route.view === "member-create" || route.view === "member-profile") {
    return "members";
  }
  return route.view === "not-found" ? undefined : route.view;
}

export function canAccessDashboardRoute(
  route: DashboardRoute,
  role?: string,
): boolean {
  const normalizedRole = role?.trim().toLowerCase();
  const protectedView = getRouteNavView(route);
  if (!protectedView || !["areas", "members", "audit"].includes(protectedView)) {
    return true;
  }
  return (
    normalizedRole === "presidencia" || normalizedRole === "directiva_de_area"
  );
}
