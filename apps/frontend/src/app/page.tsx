"use client";

import { useEffect, useMemo, useState } from "react";

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
  areaId: number;
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
  role: string;
  areaId?: number | null;
  area?: Area | null;
  activityStatus?: "active" | "inactive" | string;
  availabilityStatus?: "available" | "unavailable" | string;
  skills?: Skill[];
  memberships?: AreaMembership[];
};

type ProjectMembership = {
  id: number;
  role: string;
  memberId: number;
  member?: Member;
};

type ProjectPhase = {
  id: number;
  name: string;
  orderIndex: number;
};

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ACCESS_HEADERS = {
  "x-role": process.env.NEXT_PUBLIC_ACCESS_ROLE ?? "presidencia",
  ...(process.env.NEXT_PUBLIC_ACCESS_AREA_ID
    ? { "x-area-id": process.env.NEXT_PUBLIC_ACCESS_AREA_ID }
    : {}),
  ...(process.env.NEXT_PUBLIC_ACCESS_PROJECT_IDS
    ? { "x-project-ids": process.env.NEXT_PUBLIC_ACCESS_PROJECT_IDS }
    : {}),
};

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "areas", label: "Áreas", icon: "◈" },
  { id: "members", label: "Miembros", icon: "●" },
  { id: "projects", label: "Proyectos", icon: "▣" },
  { id: "tasks", label: "Tareas", icon: "▤" },
  { id: "integrations", label: "Integraciones", icon: "⌁" },
  { id: "audit", label: "Auditoría", icon: "⌕" },
  { id: "profile", label: "Perfil", icon: "◎" },
];

const chartDays = [
  { day: "Lun", done: 46, planned: 72 },
  { day: "Mar", done: 70, planned: 92 },
  { day: "Mie", done: 42, planned: 68 },
  { day: "Jue", done: 64, planned: 88 },
  { day: "Vie", done: 52, planned: 74 },
  { day: "Sáb", done: 36, planned: 58 },
  { day: "Dom", done: 44, planned: 62 },
];

const statusStyles: Record<string, string> = {
  active: "bg-lime-500 text-lime-950",
  available: "bg-lime-500 text-lime-950",
  inactive: "bg-zinc-500 text-white",
  unavailable: "bg-amber-500 text-amber-950",
  archived: "bg-zinc-600 text-white",
  planning: "bg-rose-500 text-white",
  paused: "bg-orange-500 text-orange-950",
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: ACCESS_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await readError(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(", ");
    }
    return payload.message ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

function fullName(member: Member): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

function getMemberAreaIds(member: Member): number[] {
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  member.memberships?.forEach((membership) => ids.add(membership.areaId));
  return [...ids];
}

function getAreaName(area: Area, members: Member[]): string {
  const firstMember = members.find((member) =>
    member.memberships?.some(
      (membership) => membership.areaId === area.id && membership.area?.name,
    ),
  );
  return (
    firstMember?.memberships?.find((membership) => membership.areaId === area.id)
      ?.area?.name ?? area.name
  );
}

function normalizeProjectList(payload: PaginatedProjects | Project[]): Project[] {
  return Array.isArray(payload) ? payload : payload.data;
}

function statusClass(status?: string): string {
  return statusStyles[status?.toLowerCase() ?? ""] ?? "bg-indigo-500 text-white";
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [areas, setAreas] = useState<Area[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoadState("loading");
      setError("");
      try {
        const [areasPayload, membersPayload, projectsPayload] =
          await Promise.all([
            getJson<Area[]>("/areas"),
            getJson<Member[]>("/members"),
            getJson<PaginatedProjects | Project[]>("/projects?limit=100"),
          ]);

        if (ignore) return;
        setAreas(areasPayload);
        setMembers(membersPayload);
        setProjects(normalizeProjectList(projectsPayload));
        setSelectedAreaId((current) => current ?? areasPayload[0]?.id ?? null);
        setSelectedMemberId((current) => current ?? membersPayload[0]?.id ?? null);
        setLoadState("ready");
      } catch (currentError) {
        if (ignore) return;
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
  }, []);

  const areaMetrics = useMemo(
    () =>
      areas.map((area) => {
        const areaMembers = members.filter((member) =>
          getMemberAreaIds(member).includes(area.id),
        );
        const areaProjects = projects.filter(
          (project) => project.areaId === area.id || project.area?.id === area.id,
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

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        fullName(member).toLowerCase().includes(normalizedQuery) ||
        member.major.toLowerCase().includes(normalizedQuery) ||
        member.skills?.some((skill) =>
          skill.name.toLowerCase().includes(normalizedQuery),
        );
      const matchesStatus =
        !memberStatus ||
        member.availabilityStatus === memberStatus ||
        member.activityStatus === memberStatus;

      return matchesQuery && matchesStatus;
    });
  }, [members, query, memberStatus]);

  const activeMembers = members.filter(
    (member) => member.activityStatus !== "inactive",
  ).length;
  const availableMembers = members.filter(
    (member) => member.availabilityStatus === "available",
  ).length;

  return (
    <main className="min-h-screen bg-[#03030b] text-white">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[306px] border-r border-white/5 bg-[#191922] px-8 py-10 lg:block">
          <Logo />
          <nav className="mt-12 space-y-4">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                active={view === item.id}
                icon={item.icon}
                label={item.label}
                onClick={() => setView(item.id)}
              />
            ))}
          </nav>
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
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </header>

          <div className="mx-auto w-full max-w-[1540px] px-5 py-8 sm:px-10 lg:px-20 lg:py-16">
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
              />
            )}
            {view === "areas" && (
              <AreasView
                metrics={areaMetrics}
                onSelectArea={(areaId) => {
                  setSelectedAreaId(areaId);
                  setView("area-detail");
                }}
              />
            )}
            {view === "area-detail" && selectedArea && (
              <AreaDetailView
                metric={selectedArea}
                onBack={() => setView("areas")}
                onOpenMember={(memberId) => {
                  setSelectedMemberId(memberId);
                  setView("member-profile");
                }}
              />
            )}
            {view === "members" && (
              <MembersView
                members={filteredMembers}
                query={query}
                memberStatus={memberStatus}
                onQueryChange={setQuery}
                onStatusChange={setMemberStatus}
                onOpenMember={(memberId) => {
                  setSelectedMemberId(memberId);
                  setView("member-profile");
                }}
              />
            )}
            {view === "member-profile" && selectedMember && (
              <MemberProfileView
                member={selectedMember}
                projects={projects.filter((project) =>
                  project.memberships?.some(
                    (membership) => membership.memberId === selectedMember.id,
                  ),
                )}
                onBack={() => setView("members")}
              />
            )}
            {view === "projects" && <ProjectsView projects={projects} />}
            {view === "tasks" && <PlaceholderView title="Tareas" />}
            {view === "integrations" && <PlaceholderView title="Integraciones" />}
            {view === "audit" && <PlaceholderView title="Auditoría" />}
            {view === "profile" && <ProfileView />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-md border border-white/20 bg-white text-[#191922]">
        <span className="text-xl font-black leading-none">U</span>
      </div>
      {!compact && (
        <span className="text-2xl font-black tracking-[0.08em]">UNICORE</span>
      )}
    </div>
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
      className={`flex h-10 w-full items-center gap-5 rounded-md px-3 text-left text-[23px] font-medium transition ${
        active
          ? "bg-[#252633] text-white"
          : "text-white/90 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="grid h-7 w-7 place-items-center text-xl">{icon}</span>
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
      {subtitle && <p className="mt-3 max-w-3xl text-lg text-white/60">{subtitle}</p>}
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
}: {
  areaCount: number;
  memberCount: number;
  activeMembers: number;
  availableMembers: number;
  projects: Project[];
  loading: boolean;
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
                <div key={day.day} className="flex flex-1 flex-col items-center gap-3">
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
          <MetricCard label="Áreas activas" value={loading ? "..." : areaCount} />
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
                subtitle: ACCESS_HEADERS["x-role"],
                meta: "Headers",
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

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/8 bg-[#20212c] p-7">
      <p className="text-sm font-semibold text-white/55">{label}</p>
      <p className="mt-4 text-3xl font-black">{value}</p>
    </div>
  );
}

function AreasView({
  metrics,
  onSelectArea,
}: {
  metrics: Array<{
    area: Area;
    memberCount: number;
    projectCount: number;
    members: Member[];
    projects: Project[];
  }>;
  onSelectArea: (areaId: number) => void;
}) {
  return (
    <div>
      <SectionTitle
        title="Áreas"
        subtitle="Cards dinámicas con conteos derivados de miembros y proyectos cargados desde API."
      />
      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <button
            key={metric.area.id}
            type="button"
            onClick={() => onSelectArea(metric.area.id)}
            className="rounded-md border border-white/8 bg-[#20212c] p-7 text-left transition hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className="flex items-start justify-between gap-4">
              <AreaBadge name={metric.area.name} />
              <span className="rounded bg-white/8 px-2 py-1 text-xs text-white/65">
                #{metric.area.id}
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-black">
              {getAreaName(metric.area, metric.members)}
            </h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-white/55">
              {metric.area.description ?? "Área operativa de UNICORE."}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <CountPill label="Miembros" value={metric.memberCount} />
              <CountPill label="Proyectos" value={metric.projectCount} />
            </div>
          </button>
        ))}
      </div>
      {metrics.length === 0 && <EmptyState text="No hay áreas disponibles." />}
    </div>
  );
}

function AreaDetailView({
  metric,
  onBack,
  onOpenMember,
}: {
  metric: {
    area: Area;
    memberCount: number;
    projectCount: number;
    members: Member[];
    projects: Project[];
  };
  onBack: () => void;
  onOpenMember: (memberId: number) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-md bg-white/8 px-4 py-2 text-sm text-white/80 hover:bg-white/12"
      >
        &lt; Volver
      </button>
      <SectionTitle
        title={metric.area.name}
        subtitle={metric.area.description ?? "Detalle del área y sus miembros."}
      />
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <MetricCard label="Miembros" value={metric.memberCount} />
        <MetricCard label="Proyectos" value={metric.projectCount} />
        <MetricCard
          label="Disponibles"
          value={
            metric.members.filter(
              (member) => member.availabilityStatus === "available",
            ).length
          }
        />
      </div>
      <Panel title="Miembros del área">
        <MemberTable members={metric.members} onOpenMember={onOpenMember} />
      </Panel>
    </div>
  );
}

function MembersView({
  members,
  query,
  memberStatus,
  onQueryChange,
  onStatusChange,
  onOpenMember,
}: {
  members: Member[];
  query: string;
  memberStatus: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onOpenMember: (memberId: number) => void;
}) {
  return (
    <div>
      <SectionTitle
        title="Miembros"
        subtitle="Directorio searchable y filtrable conectado a la API de miembros."
      />
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <SearchInput
          value={query}
          placeholder="Buscar miembros, carrera o skill..."
          onChange={onQueryChange}
        />
        <select
          value={memberStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-10 rounded-md border border-white/10 bg-[#20212c] px-3 text-sm text-white"
        >
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="unavailable">No disponible</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
      <Panel title={`Resultados (${members.length})`}>
        <MemberTable members={members} onOpenMember={onOpenMember} />
      </Panel>
    </div>
  );
}

function MemberProfileView({
  member,
  projects,
  onBack,
}: {
  member: Member;
  projects: Project[];
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-md bg-white/8 px-4 py-2 text-sm text-white/80 hover:bg-white/12"
      >
        &lt; Volver
      </button>
      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-md border border-white/8 bg-[#20212c] p-8">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-md bg-white text-3xl font-black text-[#20212c]">
              {member.firstNames[0]}
              {member.lastNames[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black">{fullName(member)}</h1>
              <p className="mt-1 text-white/60">{member.major}</p>
            </div>
          </div>
          <div className="mt-8 space-y-4 text-sm">
            <InfoRow label="Institución" value={member.institution ?? "UNI"} />
            <InfoRow label="Código" value={member.studentCode ?? "Sin código"} />
            <InfoRow label="Rol" value={member.role} />
            <InfoRow
              label="Estado"
              value={member.availabilityStatus ?? "Sin estado"}
            />
          </div>
        </div>
        <div className="grid gap-6">
          <Panel title="Áreas">
            <div className="flex flex-wrap gap-2">
              {member.memberships?.map((membership) => (
                <span
                  key={`${membership.areaId}-${membership.role}`}
                  className="rounded bg-white/8 px-3 py-1 text-sm text-white/80"
                >
                  {membership.area?.name ?? `Área ${membership.areaId}`} ·{" "}
                  {membership.role ?? "miembro"}
                </span>
              ))}
              {!member.memberships?.length && (
                <span className="text-sm text-white/45">Sin áreas cargadas.</span>
              )}
            </div>
          </Panel>
          <Panel title="Skills">
            <div className="flex flex-wrap gap-2">
              {member.skills?.map((skill) => (
                <span
                  key={skill.id ?? skill.name}
                  className="rounded bg-[#7478ff]/20 px-3 py-1 text-sm text-indigo-100"
                >
                  {skill.name}
                </span>
              ))}
              {!member.skills?.length && (
                <span className="text-sm text-white/45">Sin skills cargadas.</span>
              )}
            </div>
          </Panel>
          <Panel title="Proyectos">
            <StackList
              items={projects.map((project) => ({
                title: project.name,
                subtitle: project.description ?? "Sin descripción",
                meta: project.area?.name ?? "Sin área",
              }))}
              empty="No hay proyectos asociados en la respuesta actual."
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ProjectsView({ projects }: { projects: Project[] }) {
  const [projectQuery, setProjectQuery] = useState("");
  const filteredProjects = projects.filter((project) =>
    `${project.name} ${project.description ?? ""} ${project.area?.name ?? ""}`
      .toLowerCase()
      .includes(projectQuery.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle title="Proyectos" />
        <button
          type="button"
          className="h-10 rounded-md bg-white/14 px-5 text-sm font-bold text-white hover:bg-white/20"
        >
          + Crear Proyecto
        </button>
      </div>
      <SearchInput
        value={projectQuery}
        placeholder="Buscar proyectos..."
        onChange={setProjectQuery}
      />
      <div className="mt-10 grid gap-x-32 gap-y-20 xl:grid-cols-2">
        {filteredProjects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            status={index % 4 === 0 ? "paused" : index % 4 === 1 ? "archived" : index % 4 === 2 ? "active" : "planning"}
          />
        ))}
      </div>
      {filteredProjects.length === 0 && (
        <EmptyState text="No hay proyectos que coincidan con la búsqueda." />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  status,
}: {
  project: Project;
  status: string;
}) {
  const label =
    status === "paused"
      ? "Pausado"
      : status === "archived"
        ? "Archivado"
        : status === "planning"
          ? "En planificación"
          : "Activo";

  return (
    <article className="grid min-h-[190px] grid-cols-[92px_minmax(0,1fr)] gap-8 rounded-md border border-white/10 bg-[#20212c] p-8">
      <ProjectMark />
      <div className="min-w-0">
        <h2 className="truncate text-3xl font-black">{project.name}</h2>
        <p className="mt-3 max-w-md text-sm leading-5 text-white/60">
          {project.description ?? "Proyecto registrado en UNICORE."}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded bg-[#171822] px-4 py-1.5 text-xs font-bold text-white hover:bg-black/40"
          >
            Editar Proyecto
          </button>
          <span className={`rounded px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
            {label}
          </span>
        </div>
      </div>
    </article>
  );
}

function ProjectMark() {
  return (
    <div className="relative h-[92px] w-[92px] text-white">
      <div className="absolute left-1 top-2 h-16 w-6 rounded-b-full rounded-t-sm bg-white" />
      <div className="absolute right-1 top-2 h-16 w-6 rounded-b-full rounded-t-sm bg-white" />
      <div className="absolute left-[34px] top-7 h-0 w-0 border-y-[15px] border-l-[24px] border-y-transparent border-l-[#20212c]" />
      <div className="absolute bottom-4 left-2 h-1 w-20 rotate-12 rounded bg-white" />
      <div className="absolute bottom-2 left-2 h-1 w-20 -rotate-12 rounded bg-white" />
    </div>
  );
}

function MemberTable({
  members,
  onOpenMember,
}: {
  members: Member[];
  onOpenMember: (memberId: number) => void;
}) {
  if (members.length === 0) {
    return <EmptyState text="No hay miembros para mostrar." compact />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
        <thead className="text-xs uppercase text-white/40">
          <tr>
            <th className="px-4 py-2">Miembro</th>
            <th className="px-4 py-2">Carrera</th>
            <th className="px-4 py-2">Rol</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2">Skills</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className="rounded-md bg-[#171822] text-sm text-white/80"
            >
              <td className="rounded-l-md px-4 py-4">
                <button
                  type="button"
                  onClick={() => onOpenMember(member.id)}
                  className="font-bold text-white hover:underline"
                >
                  {fullName(member)}
                </button>
                <p className="mt-1 text-xs text-white/45">
                  {member.studentCode ?? "Sin código"}
                </p>
              </td>
              <td className="px-4 py-4">{member.major}</td>
              <td className="px-4 py-4">{member.role}</td>
              <td className="px-4 py-4">
                <span
                  className={`rounded px-2 py-1 text-xs font-bold ${statusClass(
                    member.availabilityStatus ?? member.activityStatus,
                  )}`}
                >
                  {member.availabilityStatus ?? member.activityStatus ?? "N/D"}
                </span>
              </td>
              <td className="rounded-r-md px-4 py-4">
                {member.skills?.slice(0, 3).map((skill) => skill.name).join(", ") ||
                  "Sin skills"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block w-full max-w-[670px]">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
        ⌕
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-white/10 bg-[#f1f1f5] pl-9 pr-4 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-500 focus:border-indigo-300"
      />
    </label>
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

function AreaBadge({ name }: { name: string }) {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-md bg-white text-xl font-black text-[#20212c]">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-[#171822] px-4 py-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
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

function ProfileView() {
  return (
    <div>
      <SectionTitle title="Perfil" />
      <Panel title="Sesión actual">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoRow label="Rol" value={ACCESS_HEADERS["x-role"]} />
          <InfoRow
            label="Área"
            value={ACCESS_HEADERS["x-area-id"] ?? "Todas"}
          />
          <InfoRow
            label="API"
            value={API_URL.replace(/^https?:\/\//, "")}
          />
        </div>
      </Panel>
    </div>
  );
}
