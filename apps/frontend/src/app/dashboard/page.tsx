"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  API_URL,
  AUTH_TOKEN_STORAGE_KEY,
  READ_ONLY_STORAGE_KEY,
  getJson,
} from "@/lib/auth-client";
import {
  loadMemberProfile,
  type MemberProfileLoadResult,
} from "../member-profile-client";
import ProjectManagement from "../project-management";
import TaskManagement from "../task-management";
import AuditManagementView from "../audit-management";
import {
  AreaDetailManagementView,
  AreasManagementView,
  MemberProfileManagementView,
  MembersManagementView,
} from "../people-management";
import { canCreateMemberInArea } from "../people-management-utils";
import { MemberForm } from "../people-management/member-form";
import type {
  Area,
  AuthState,
  LoadState,
  Member,
  Project,
  View,
} from "./dashboard.types";
import {
  canSeeNavItem,
  fullName,
  getAllProjects,
  getAreasPath,
  getMemberAreaIds,
  navItems,
  resolveAreaNavigation,
} from "./dashboard.model";
import {
  canAccessDashboardRoute,
  getDashboardPath,
  getMemberCreationPath,
  getRouteNavView,
  parseMemberCreationAreaId,
  parseDashboardPath,
} from "./dashboard-route";
import {
  DashboardView,
  Logo,
  NavButton,
  PlaceholderView,
  ProfileView,
  RouteStateView,
  SessionLoadingView,
} from "./dashboard.components";

export default function DashboardPage() {
  return (
    <Suspense fallback={<SessionLoadingView />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ segments?: string[] }>();
  const pathname = params.segments?.length
    ? `/dashboard/${params.segments.join("/")}`
    : "/dashboard";
  const route = parseDashboardPath(pathname);
  const view = route.view;
  const activeNavView = getRouteNavView(route);
  const [authState, setAuthState] = useState<AuthState>("initializing");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [memberProfileState, setMemberProfileState] = useState<
    MemberProfileLoadResult | { status: "idle" | "loading" }
  >({ status: "idle" });
  const [memberProfileRefresh, setMemberProfileRefresh] = useState(0);
  const currentMemberRole = currentMember?.role;
  const visibleNavItems = navItems.filter((item) =>
    canSeeNavItem(item.id, currentMemberRole),
  );

  useEffect(() => {
    let ignore = false;

    async function restoreSession() {
      await Promise.resolve();
      if (ignore) return;

      const storedToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setAuthState("anonymous");
        return;
      }

      try {
        const member = await getJson<Member>("/auth/me", storedToken);
        if (ignore) return;
        setAccessToken(storedToken);
        setCurrentMember(member);
        window.sessionStorage.setItem(
          READ_ONLY_STORAGE_KEY,
          String(Boolean(member.readOnly)),
        );
        setAuthState("authenticated");
      } catch {
        if (ignore) return;
        window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setAuthState("anonymous");
      }
    }

    void restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (authState === "anonymous") {
      router.replace("/login");
    }
  }, [authState, router]);

  useEffect(() => {
    if (authState !== "authenticated" || !accessToken || !currentMemberRole) {
      return;
    }

    const authenticatedRole = currentMemberRole;
    const token = accessToken;
    let ignore = false;

    async function loadData() {
      setLoadState("loading");
      setError("");
      try {
        const isMember = authenticatedRole === "miembro";
        const [loadedAreas, loadedMembers, loadedProjects] = await Promise.all([
          isMember
            ? Promise.resolve([])
            : getJson<Area[]>(getAreasPath(authenticatedRole), token),
          isMember ? Promise.resolve([]) : getJson<Member[]>("/members", token),
          getAllProjects(token),
        ]);

        if (ignore) return;

        setAreas(loadedAreas);
        setMembers(loadedMembers);
        setProjects(loadedProjects);
        setLoadState("ready");
      } catch (currentError) {
        if (ignore) return;

        if (currentError instanceof ApiError && currentError.status === 401) {
          window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          setAccessToken(null);
          setCurrentMember(null);
          setAreas([]);
          setMembers([]);
          setProjects([]);
          setLoadState("idle");
          setAuthState("anonymous");
          return;
        }

        setError("No pudimos cargar toda la información. Inténtalo nuevamente.");
        setLoadState("error");
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [accessToken, authState, currentMemberRole]);

  useEffect(() => {
    if (
      authState !== "authenticated" ||
      !accessToken ||
      !currentMemberRole ||
      route.view !== "member-profile" ||
      !route.resourceId
    ) {
      return;
    }

    const memberId = route.resourceId;
    const token = accessToken;
    const role = currentMemberRole;
    let ignore = false;

    async function loadProfile() {
      await Promise.resolve();
      if (ignore) return;
      setMemberProfileState({ status: "loading" });
      const result = await loadMemberProfile(memberId, token, role);
      if (!ignore) setMemberProfileState(result);
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [
    accessToken,
    authState,
    currentMemberRole,
    memberProfileRefresh,
    route.resourceId,
    route.view,
  ]);

  useEffect(() => {
    if (loadState !== "ready" || view !== "areas" || !currentMemberRole) {
      return;
    }
    const navResolution = resolveAreaNavigation(areas, currentMemberRole);
    if (
      navResolution.targetView === "area-detail" &&
      navResolution.targetAreaId
    ) {
      router.replace(
        getDashboardPath("area-detail", navResolution.targetAreaId),
      );
    }
  }, [areas, currentMemberRole, loadState, router, view]);

  const handleLogout = (): void => {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setCurrentMember(null);
    window.sessionStorage.removeItem(READ_ONLY_STORAGE_KEY);
    setAreas([]);
    setMembers([]);
    setProjects([]);
    setLoadState("idle");
    setError("");
    setAuthState("anonymous");
  };

  const refreshProjects = async (): Promise<void> => {
    if (!accessToken) return;
    const loadedProjects = await getAllProjects(accessToken);
    setProjects(loadedProjects);
  };

  const handleNavigateToNavItem = (itemId: View): void => {
    if (itemId === "areas") {
      const navResolution = resolveAreaNavigation(areas, currentMemberRole);
      if (
        navResolution.targetView === "area-detail" &&
        navResolution.targetAreaId
      ) {
        router.push(
          getDashboardPath("area-detail", navResolution.targetAreaId),
        );
        return;
      }
    }
    router.push(getDashboardPath(itemId));
  };

  const refreshPeopleData = async (): Promise<void> => {
    if (!accessToken || !currentMemberRole || currentMemberRole === "miembro")
      return;
    const [loadedAreas, loadedMembers, loadedProjects] = await Promise.all([
      getJson<Area[]>(getAreasPath(currentMemberRole), accessToken),
      getJson<Member[]>("/members", accessToken),
      getAllProjects(accessToken),
    ]);
    setAreas(loadedAreas);
    setMembers(loadedMembers);
    setProjects(loadedProjects);
  };

  const areaMetrics = useMemo(
    () =>
      areas.map((area) => {
        const areaMembers = members.filter((member) =>
          getMemberAreaIds(member).includes(area.id),
        );
        const areaProjects = projects.filter(
          (project) =>
            project.areaId === area.id || project.area?.id === area.id,
        );

        return {
          area,
          memberCount: areaMembers.length,
          projectCount: areaProjects.length,
          members: areaMembers,
          projects: areaProjects,
        };
      }),
    [areas, members, projects],
  );

  const selectedArea =
    route.view === "area-detail"
      ? areaMetrics.find((metric) => metric.area.id === route.resourceId)
      : undefined;

  const selectedMember =
    memberProfileState.status === "ready" &&
    memberProfileState.member.id === route.resourceId
      ? memberProfileState.member
      : undefined;

  const hasCreationAreaContext =
    view === "member-create" && searchParams.has("areaId");
  const creationAreaId =
    view === "member-create"
      ? parseMemberCreationAreaId(searchParams.get("areaId"))
      : undefined;
  const creationArea = creationAreaId
    ? areas.find((area) => area.id === creationAreaId && !area.isArchived)
    : undefined;
  const memberCreationReturnPath = creationAreaId
    ? getDashboardPath("area-detail", creationAreaId)
    : getDashboardPath("members");
  const canCreateMember =
    view === "member-create" &&
    !currentMember?.readOnly &&
    (hasCreationAreaContext
      ? Boolean(creationArea) &&
        creationAreaId !== undefined &&
        canCreateMemberInArea(
          currentMemberRole ?? "",
          currentMember?.areaId,
          creationAreaId,
        )
      : currentMemberRole === "presidencia");

  const activeMembers = members.filter(
    (member) => member.activityStatus !== "inactive",
  ).length;
  const availableMembers = members.filter(
    (member) => member.availabilityStatus === "available",
  ).length;

  if (authState !== "authenticated" || !currentMember || !accessToken) {
    return <SessionLoadingView />;
  }

  const routeAuthorized = canAccessDashboardRoute(route, currentMember.role);

  return (
    <main className="min-h-screen bg-[#060610] text-white">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[306px] flex-col overflow-y-auto border-r border-white/5 bg-[#191822] px-[52px] py-[50px] lg:flex">
          <Logo />
          <nav className="mt-9 flex-none space-y-3">
            {visibleNavItems.map((item) => (
              <NavButton
                key={item.id}
                active={activeNavView === item.id}
                href={
                  item.id === "areas"
                    ? resolveAreaNavigation(areas, currentMemberRole).targetView === "area-detail" &&
                      resolveAreaNavigation(areas, currentMemberRole).targetAreaId
                      ? getDashboardPath(
                          "area-detail",
                          resolveAreaNavigation(areas, currentMemberRole).targetAreaId!,
                        )
                      : getDashboardPath("areas")
                    : getDashboardPath(item.id)
                }
                icon={item.icon}
                label={item.label}
              />
            ))}
          </nav>
          <div className="mt-auto flex-none border-t border-white/10 pt-6">
            <p className="truncate text-sm font-bold">
              {fullName(currentMember)}
            </p>
            <p className="mt-1 text-xs text-white/45">{currentMember.role}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-md bg-white/8 px-3 py-2 text-sm font-semibold hover:bg-white/12"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <section className="flex min-h-screen w-full flex-col lg:pl-[306px]">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#03030b]/90 px-5 py-4 backdrop-blur lg:hidden">
            <Logo compact />
            <select
              aria-label="Cambiar vista"
              value={activeNavView ?? "dashboard"}
              onChange={(event) =>
                handleNavigateToNavItem(event.target.value as View)
              }
              className="rounded-md border border-white/10 bg-[#20212c] px-3 py-2 text-sm text-white"
            >
              {visibleNavItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-white/8 px-3 py-2 text-sm font-semibold"
            >
              Salir
            </button>
          </header>

          <div className="w-full px-5 py-8 sm:px-10 lg:px-[68px] lg:py-[50px]">
            {currentMember.readOnly && (
              <div className="mb-6 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Modo de solo lectura: estás viendo información hasta tu fecha de
                inhabilitación.
              </div>
            )}
            {error && (
              <div className="mb-8 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            {view === "not-found" && (
              <RouteStateView
                title="Página no encontrada"
                description="La dirección solicitada no corresponde a una vista disponible de UNICORE."
              />
            )}
            {view !== "not-found" && !routeAuthorized && (
              <RouteStateView
                title="Acceso restringido"
                description="Tu rol no tiene permisos para abrir esta vista."
              />
            )}
            {view === "dashboard" && routeAuthorized && (
              <DashboardView
                areaCount={areas.filter((area) => !area.isArchived).length}
                memberCount={members.length}
                activeMembers={activeMembers}
                availableMembers={availableMembers}
                projects={projects}
                loading={loadState === "loading"}
                authRole={currentMember.role}
              />
            )}
            {view === "areas" && routeAuthorized && (
              <AreasManagementView
                metrics={areaMetrics}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={refreshPeopleData}
                onSelectArea={(areaId) => {
                  router.push(getDashboardPath("area-detail", areaId));
                }}
              />
            )}
            {view === "area-detail" && routeAuthorized && selectedArea && (
              <AreaDetailManagementView
                metric={selectedArea}
                accessToken={accessToken}
                currentRole={currentMember.role}
                currentAreaId={currentMember.areaId}
                showBackLink={
                  currentMember.role === "presidencia" ||
                  areas.filter((a) => !a.isArchived).length > 1
                }
                onChanged={refreshPeopleData}
                onBack={() => router.push(getDashboardPath("areas"))}
                onAddMember={(areaId) => {
                  router.push(getMemberCreationPath(areaId));
                }}
                onOpenMember={(memberId) => {
                  router.push(getDashboardPath("member-profile", memberId));
                }}
              />
            )}
            {view === "area-detail" &&
              routeAuthorized &&
              loadState === "ready" &&
              !selectedArea && (
                <RouteStateView
                  title="Área no encontrada"
                  description="El área solicitada no existe o ya no está disponible para tu cuenta."
                  href={getDashboardPath("areas")}
                  action="Volver a áreas"
                />
              )}
            {view === "members" && routeAuthorized && (
              <MembersManagementView
                members={members}
                areas={areas}
                projects={projects}
                currentRole={currentMember.role}
                onCreateMember={() => router.push(getMemberCreationPath())}
                onOpenMember={(memberId) => {
                  router.push(getDashboardPath("member-profile", memberId));
                }}
              />
            )}
            {view === "member-create" &&
              routeAuthorized &&
              loadState === "ready" &&
              canCreateMember && (
                <MemberForm
                  areas={areas}
                  accessToken={accessToken}
                  initialAreaId={creationAreaId}
                  fixedAreaId={
                    currentMember.role === "directiva_de_area"
                      ? creationAreaId
                      : undefined
                  }
                  regularMemberOnly={
                    currentMember.role === "directiva_de_area"
                  }
                  onClose={() => {
                    router.replace(memberCreationReturnPath);
                  }}
                  onCloseAfterSaveFailure={() => {
                    window.location.replace(memberCreationReturnPath);
                  }}
                  onSaved={async (memberId) => {
                    await refreshPeopleData();
                    router.replace(
                      creationAreaId
                        ? getDashboardPath("area-detail", creationAreaId)
                        : getDashboardPath("member-profile", memberId),
                    );
                  }}
                />
              )}
            {view === "member-create" &&
              routeAuthorized &&
              loadState === "ready" &&
              !canCreateMember && (
                <RouteStateView
                  title="No se puede añadir el miembro"
                  description="El área solicitada no está activa o tu rol no permite crear miembros en ella."
                  href={
                    creationAreaId
                      ? getDashboardPath("area-detail", creationAreaId)
                      : getDashboardPath("members")
                  }
                  action="Volver"
                />
              )}
            {view === "member-profile" &&
              routeAuthorized &&
              (memberProfileState.status === "idle" ||
                memberProfileState.status === "loading") && (
                <RouteStateView
                  title="Cargando perfil"
                  description="Estamos preparando la información del miembro."
                />
              )}
            {view === "member-profile" && routeAuthorized && selectedMember && (
              <MemberProfileManagementView
                member={selectedMember}
                areas={areas}
                projects={projects}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={async () => {
                  await refreshPeopleData();
                  setMemberProfileRefresh((value) => value + 1);
                }}
                onBack={() => router.push(getDashboardPath("members"))}
              />
            )}
            {view === "member-profile" &&
              routeAuthorized &&
              (memberProfileState.status === "not-found" ||
                memberProfileState.status === "unauthorized" ||
                memberProfileState.status === "error") && (
                <RouteStateView
                  title={memberProfileState.title}
                  description={memberProfileState.description}
                  href={getDashboardPath("members")}
                  action="Volver a miembros"
                />
              )}
            {view === "projects" && routeAuthorized && accessToken && (
              <ProjectManagement
                projects={projects}
                areas={areas}
                members={members}
                accessToken={accessToken}
                apiUrl={API_URL}
                currentRole={currentMember.role}
                onProjectsChanged={refreshProjects}
              />
            )}
            {view === "tasks" && routeAuthorized && accessToken && (
              <TaskManagement
                projects={projects}
                accessToken={accessToken}
                apiUrl={API_URL}
                currentMember={currentMember}
              />
            )}
            {view === "integrations" && routeAuthorized && (
              <PlaceholderView title="Integraciones" />
            )}
            {view === "audit" && routeAuthorized && accessToken && (
              <AuditManagementView accessToken={accessToken} />
            )}
            {view === "profile" && routeAuthorized && (
              <ProfileView member={currentMember} onLogout={handleLogout} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
