"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  API_URL,
  AUTH_TOKEN_STORAGE_KEY,
  getJson,
} from "@/lib/auth-client";
import ProjectManagement from "../project-management";
import {
  AreaDetailManagementView,
  AreasManagementView,
  MemberProfileManagementView,
  MembersManagementView,
} from "../people-management";

type View =
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

type Area = {
  id: number;
  name: string;
  description: string | null;
  isArchived?: boolean;
};

type Skill = {
  id?: number;
  name: string;
};

type AreaMembership = {
  id?: number;
  areaId: number | null;
  role?: string;
  area?: Area;
};

type Member = {
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

type ProjectMembership = {
  id: number;
  role: "representative" | "subrepresentative" | "member";
  memberId: number;
  member?: Member;
};

type ProjectPhase = {
  id: number;
  name: string;
  description?: string | null;
  orderIndex: number;
};

type ProjectLabel = {
  id?: number;
  name: string;
};

type ProjectLink = {
  id?: number;
  name: string;
  url: string;
};

type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

type Project = {
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

type PaginatedProjects = {
  data: Project[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
};

type LoadState = "idle" | "loading" | "ready" | "error";
type AuthState = "initializing" | "anonymous" | "authenticated";

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "/figma/nav-dashboard.svg" },
  { id: "areas", label: "Áreas", icon: "/figma/nav-areas.svg" },
  { id: "members", label: "Miembros", icon: "/figma/nav-members.svg" },
  { id: "projects", label: "Proyectos", icon: "/figma/nav-projects.svg" },
  { id: "tasks", label: "Tareas", icon: "/figma/nav-tasks.svg" },
  {
    id: "integrations",
    label: "Integraciones",
    icon: "/figma/nav-integrations.svg",
  },
  { id: "audit", label: "Auditoría", icon: "/figma/nav-audit.svg" },
  { id: "profile", label: "Perfil", icon: "/figma/nav-profile.svg" },
];

function canSeeNavItem(item: View, role?: string): boolean {
  const normalizedRole = role?.trim().toLowerCase();
  const canManagePeople =
    normalizedRole === "presidencia" || normalizedRole === "directiva_de_area";

  if (item === "areas" || item === "members") {
    return canManagePeople;
  }

  if (item === "audit") {
    return canManagePeople;
  }

  return true;
}

const chartDays = [
  { day: "Lun", done: 46, planned: 72 },
  { day: "Mar", done: 70, planned: 92 },
  { day: "Mie", done: 42, planned: 68 },
  { day: "Jue", done: 64, planned: 88 },
  { day: "Vie", done: 52, planned: 74 },
  { day: "Sáb", done: 36, planned: 58 },
  { day: "Dom", done: 44, planned: 62 },
];

function fullName(member: Member): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

function getMemberAreaIds(member: Member): number[] {
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  member.memberships?.forEach((membership) => {
    if (typeof membership.areaId === "number") ids.add(membership.areaId);
  });
  return [...ids];
}

function normalizeProjectList(
  payload: PaginatedProjects | Project[],
): Project[] {
  return Array.isArray(payload) ? payload : payload.data;
}

function getAreasPath(role: string): string {
  return role === "presidencia" ? "/areas?includeArchived=true" : "/areas";
}

async function getAllProjects(accessToken: string): Promise<Project[]> {
  const firstPage = await getJson<PaginatedProjects | Project[]>(
    "/projects?page=1&limit=100",
    accessToken,
  );

  if (Array.isArray(firstPage)) {
    return firstPage;
  }

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
                areaCount={areas.length}
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
            {view === "tasks" && <PlaceholderView title="Tareas" />}
            {view === "integrations" && (
              <PlaceholderView title="Integraciones" />
            )}
            {view === "audit" && <PlaceholderView title="Auditoría" />}
            {view === "profile" && (
              <ProfileView member={currentMember} onLogout={handleLogout} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden ${compact ? "h-10 w-36" : "h-[73px] w-[202px]"}`}
    >
      <Image
        src="/figma/unicore-logo.png"
        alt="UNICORE"
        fill
        sizes={compact ? "144px" : "202px"}
        className="object-cover"
        priority
      />
    </div>
  );
}

function SessionLoadingView() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#060610] text-white">
      <p className="text-sm text-white/60">Validando sesión…</p>
    </main>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-5 rounded-md px-3 text-left text-[20px] font-medium outline-none transition ${
        active
          ? "bg-[#252633] text-white"
          : "text-white/90 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Image
        src={icon}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        aria-hidden
      />
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-5xl font-black leading-tight tracking-normal sm:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 max-w-3xl text-lg text-white/60">{subtitle}</p>
      )}
    </div>
  );
}

function DashboardView({
  areaCount,
  memberCount,
  activeMembers,
  availableMembers,
  projects,
  loading,
  authRole,
}: {
  areaCount: number;
  memberCount: number;
  activeMembers: number;
  availableMembers: number;
  projects: Project[];
  loading: boolean;
  authRole: string;
}) {
  return (
    <div>
      <SectionTitle
        title="Dashboard"
        subtitle="Resumen operativo de áreas, miembros y proyectos conectados al backend."
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_374px]">
        <div className="min-w-0 rounded-md border border-white/8 bg-[#20212c] p-5 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Tus avances</h2>
            <p className="mt-2 text-sm text-white/55">
              Actividad semanal de referencia para el dashboard V1.
            </p>
          </div>
          <div className="max-w-full overflow-x-auto pb-2">
            <div className="flex h-[280px] min-w-[460px] items-end gap-5 border-l border-b border-white/20 px-6 pb-7 sm:min-w-0">
              {chartDays.map((day) => (
                <div
                  key={day.day}
                  className="flex flex-1 flex-col items-center gap-3"
                >
                  <div className="flex h-[220px] items-end gap-1.5">
                    <span
                      className="w-5 rounded-t bg-white"
                      style={{ height: `${day.done}%` }}
                    />
                    <span
                      className="w-5 rounded-t bg-[#7478ff]"
                      style={{ height: `${day.planned}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/60">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-6">
          <MetricCard
            label="Áreas activas"
            value={loading ? "..." : areaCount}
          />
          <MetricCard
            label="Miembros registrados"
            value={loading ? "..." : memberCount}
          />
          <MetricCard
            label="Disponibles"
            value={loading ? "..." : `${availableMembers}/${activeMembers}`}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <Panel title="Proyectos recientes">
          <StackList
            items={projects.slice(0, 5).map((project) => ({
              title: project.name,
              subtitle: project.area?.name ?? "Sin área asignada",
              meta: project.phases?.length
                ? `${project.phases.length} fases`
                : "Sin fases cargadas",
            }))}
            empty="No hay proyectos para mostrar."
          />
        </Panel>
        <Panel title="Estado de datos">
          <StackList
            items={[
              { title: "Backend API", subtitle: API_URL, meta: "Conectado" },
              {
                title: "Modo de acceso",
                subtitle: authRole,
                meta: "Bearer",
              },
            ]}
          />
        </Panel>
        <Panel title="Calidad de carga">
          <StackList
            items={[
              {
                title: "Listados dinámicos",
                subtitle: "Áreas, miembros y proyectos",
                meta: "API",
              },
              {
                title: "Charts",
                subtitle: "Permitidos como mock en scope",
                meta: "Mock",
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/8 bg-[#20212c] p-7">
      <p className="text-sm font-semibold text-white/55">{label}</p>
      <p className="mt-4 text-3xl font-black">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-white/8 bg-[#20212c] p-6">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function StackList({
  items,
  empty,
}: {
  items: Array<{ title: string; subtitle: string; meta?: string }>;
  empty?: string;
}) {
  if (items.length === 0) {
    return <EmptyState text={empty ?? "Sin resultados."} compact />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.title}-${item.subtitle}-${item.meta}`}
          className="flex items-center justify-between gap-4 rounded-md bg-[#171822] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-bold">{item.title}</p>
            <p className="truncate text-sm text-white/45">{item.subtitle}</p>
          </div>
          {item.meta && (
            <span className="shrink-0 rounded bg-white/8 px-2 py-1 text-xs text-white/65">
              {item.meta}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
      <span className="text-white/45">{label}</span>
      <span className="text-right font-semibold text-white/85">{value}</span>
    </div>
  );
}

function EmptyState({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-dashed border-white/12 text-center text-white/45 ${
        compact ? "px-4 py-6 text-sm" : "mt-8 px-6 py-14"
      }`}
    >
      {text}
    </div>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div>
      <SectionTitle title={title} />
      <Panel title="Vista base">
        <p className="text-sm leading-6 text-white/55">
          Esta sección queda representada en la navegación para mantener el
          layout del Figma. El alcance funcional de esta rama se concentra en
          Dashboard, Áreas, Miembros y Proyectos.
        </p>
      </Panel>
    </div>
  );
}

function ProfileView({
  member,
  onLogout,
}: {
  member: Member;
  onLogout: () => void;
}) {
  return (
    <div>
      <SectionTitle title="Perfil" />
      <Panel title="Sesión actual">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoRow label="Miembro" value={fullName(member)} />
          <InfoRow label="Rol" value={member.role} />
          <InfoRow
            label="Área"
            value={
              member.area?.name ??
              (member.areaId ? `Área ${member.areaId}` : "Todas")
            }
          />
          <InfoRow label="API" value={API_URL.replace(/^https?:\/\//, "")} />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-6 rounded-md bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12"
        >
          Cerrar sesión
        </button>
      </Panel>
    </div>
  );
}
