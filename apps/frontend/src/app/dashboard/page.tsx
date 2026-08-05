"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  API_URL,
  AUTH_TOKEN_STORAGE_KEY,
  getJson,
} from "@/lib/auth-client";
import ProjectManagement from "../project-management";
import TaskManagement from "../task-management";
import AuditManagementView from "../audit-management";
import {
  AreaDetailManagementView,
  AreasManagementView,
  MemberProfileManagementView,
  MembersManagementView,
} from "../people-management";
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
} from "./dashboard.model";
import { DashboardView, Logo, NavButton, PlaceholderView, ProfileView, SessionLoadingView } from "./dashboard.components";

export default function DashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("initializing");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [areas, setAreas] = useState<Area[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
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
        setSelectedAreaId((current) => current ?? loadedAreas[0]?.id ?? null);
        setMembers(loadedMembers);
        setSelectedMemberId(
          (current) => current ?? loadedMembers[0]?.id ?? null,
        );
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

        setError(
          currentError instanceof Error
            ? currentError.message
            : "No se pudo cargar la información",
        );
        setLoadState("error");
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [accessToken, authState, currentMemberRole]);

  const handleLogout = (): void => {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setCurrentMember(null);
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
    setSelectedAreaId((current) =>
      loadedAreas.some((area) => area.id === current)
        ? current
        : (loadedAreas[0]?.id ?? null),
    );
    setSelectedMemberId((current) =>
      loadedMembers.some((member) => member.id === current)
        ? current
        : (loadedMembers[0]?.id ?? null),
    );
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
    areaMetrics.find((metric) => metric.area.id === selectedAreaId) ??
    areaMetrics[0];

  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? members[0];

  const activeMembers = members.filter(
    (member) => member.activityStatus !== "inactive",
  ).length;
  const availableMembers = members.filter(
    (member) => member.availabilityStatus === "available",
  ).length;

  if (authState !== "authenticated" || !currentMember || !accessToken) {
    return <SessionLoadingView />;
  }

  return (
    <main className="min-h-screen bg-[#060610] text-white">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[306px] flex-col overflow-y-auto border-r border-white/5 bg-[#191822] px-[52px] py-[50px] lg:flex">
          <Logo />
          <nav className="mt-9 flex-none space-y-3">
            {visibleNavItems.map((item) => (
              <NavButton
                key={item.id}
                active={view === item.id}
                icon={item.icon}
                label={item.label}
                onClick={() => setView(item.id)}
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
              value={view}
              onChange={(event) => setView(event.target.value as View)}
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
            {error && (
              <div className="mb-8 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                No se pudo conectar con la API en {API_URL}: {error}
              </div>
            )}

            {view === "dashboard" && (
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
            {view === "areas" && (
              <AreasManagementView
                metrics={areaMetrics}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={refreshPeopleData}
                onSelectArea={(areaId) => {
                  setSelectedAreaId(areaId);
                  setView("area-detail");
                }}
              />
            )}
            {view === "area-detail" && selectedArea && (
              <AreaDetailManagementView
                metric={selectedArea}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={refreshPeopleData}
                onBack={() => setView("areas")}
                onGoToMembers={() => setView("members")}
                onOpenMember={(memberId) => {
                  setSelectedMemberId(memberId);
                  setView("member-profile");
                }}
              />
            )}
            {view === "members" && (
              <MembersManagementView
                members={members}
                areas={areas}
                projects={projects}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={refreshPeopleData}
                onOpenMember={(memberId) => {
                  setSelectedMemberId(memberId);
                  setView("member-profile");
                }}
              />
            )}
            {view === "member-profile" && selectedMember && (
              <MemberProfileManagementView
                member={selectedMember}
                areas={areas}
                projects={projects}
                accessToken={accessToken}
                currentRole={currentMember.role}
                onChanged={refreshPeopleData}
                onBack={() => setView("members")}
              />
            )}
            {view === "projects" && accessToken && (
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
            {view === "tasks" && accessToken && (
              <TaskManagement
                projects={projects}
                accessToken={accessToken}
                apiUrl={API_URL}
                currentMember={currentMember}
              />
            )}
            {view === "integrations" && (
              <PlaceholderView title="Integraciones" />
            )}
            {view === "audit" && accessToken && (
              <AuditManagementView accessToken={accessToken} />
            )}
            {view === "profile" && (
              <ProfileView member={currentMember} onLogout={handleLogout} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
