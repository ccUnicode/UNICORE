"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  combineProjectExperience,
  getMemberProjectLabelNames,
  getPortfolioLabelNames,
} from "./project-experience";

type Area = {
  id: number;
  name: string;
  isArchived?: boolean;
};

type Skill = {
  id?: number;
  name: string;
};

type AreaMembership = {
  areaId: number | null;
};

type Member = {
  id: number;
  firstNames: string;
  lastNames: string;
  major: string;
  cycle?: number | null;
  areaId?: number | null;
  activityStatus?: string;
  availabilityStatus?: string;
  skills?: Skill[];
  memberships?: AreaMembership[];
};

type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

type ProjectLabel = {
  id?: number;
  name: string;
};

type ProjectLink = {
  id?: number;
  name: string;
  url: string;
};

type ProjectPhase = {
  id: number;
  name: string;
  description?: string | null;
  orderIndex: number;
};

type ProjectMembership = {
  id: number;
  memberId: number;
  role: ProjectRole;
  member?: Member;
};

type Project = {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  areaId?: number;
  area?: Area | null;
  status: ProjectStatus;
  isArchived: boolean;
  labels?: ProjectLabel[];
  links?: ProjectLink[];
  phases?: ProjectPhase[];
  memberships?: ProjectMembership[];
};

type ProjectRole = "representative" | "subrepresentative" | "member";

type PaginatedProjects = {
  data: Project[];
  meta: {
    lastPage: number;
  };
};

type ProjectFormValues = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  areaId: string;
  labels: string;
  status: ProjectStatus;
};

type Props = {
  projects: Project[];
  areas: Area[];
  members: Member[];
  accessToken: string;
  apiUrl: string;
  currentRole: string;
  onProjectsChanged: () => Promise<void>;
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "En planificación",
  active: "Activo",
  on_hold: "Pausado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<ProjectStatus | "archived", string> = {
  planned: "bg-rose-500 text-white",
  active: "bg-lime-500 text-lime-950",
  on_hold: "bg-orange-500 text-orange-950",
  completed: "bg-sky-500 text-sky-950",
  cancelled: "bg-red-500 text-white",
  archived: "bg-zinc-600 text-white",
};

const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  representative: "Representante",
  subrepresentative: "Subrepresentante",
  member: "Miembro",
};

const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  areaId: "",
  labels: "",
  status: "planned",
};

function memberName(member: Member): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function memberAreaIds(member: Member): number[] {
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  member.memberships?.forEach((membership) => {
    if (typeof membership.areaId === "number") ids.add(membership.areaId);
  });
  return [...ids];
}

function parseLabels(labels: string): string[] {
  return [
    ...new Map(
      labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => [normalize(label), label]),
    ).values(),
  ];
}

async function requestJson<T>(
  apiUrl: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const payload = (await response.json()) as {
        message?: string | string[];
      };
      message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : (payload.message ?? message);
    } catch {
      // Keep the status-based fallback when the API has no JSON error body.
    }
    throw new Error(message);
  }

  if (
    response.status === 204 ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function fetchProjectList(
  apiUrl: string,
  accessToken: string,
  archived: boolean,
): Promise<Project[]> {
  const first = await requestJson<PaginatedProjects>(
    apiUrl,
    accessToken,
    `/projects?page=1&limit=100&archived=${archived}`,
  );
  const projects = [...first.data];

  for (let page = 2; page <= first.meta.lastPage; page += 1) {
    const next = await requestJson<PaginatedProjects>(
      apiUrl,
      accessToken,
      `/projects?page=${page}&limit=100&archived=${archived}`,
    );
    projects.push(...next.data);
  }

  return projects;
}

export default function ProjectManagement({
  projects,
  areas,
  members,
  accessToken,
  apiUrl,
  currentRole,
  onProjectsChanged,
}: Props) {
  const canManage =
    currentRole === "presidencia" || currentRole === "directiva_de_area";
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visibleProjects = archivedOnly ? archivedProjects : projects;
  const experienceProjects = useMemo(
    () => combineProjectExperience(projects, archivedProjects),
    [archivedProjects, projects],
  );
  const labels = useMemo(
    () =>
      Array.from(
        new Set(visibleProjects.flatMap((project) => project.labels?.map((label) => label.name) ?? [])),
      ).sort((a, b) => a.localeCompare(b)),
    [visibleProjects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = normalize(query);
    return visibleProjects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(
          `${project.name} ${project.description ?? ""} ${project.area?.name ?? ""}`,
        ).includes(normalizedQuery);
      const matchesStatus = !statusFilter || project.status === statusFilter;
      const matchesArea =
        !areaFilter ||
        project.areaId === Number(areaFilter) ||
        project.area?.id === Number(areaFilter);
      const matchesLabel =
        !labelFilter ||
        project.labels?.some(
          (label) => normalize(label.name) === normalize(labelFilter),
        );
      return matchesQuery && matchesStatus && matchesArea && matchesLabel;
    });
  }, [areaFilter, labelFilter, query, statusFilter, visibleProjects]);

  useEffect(() => {
    let ignore = false;

    const loadArchived = async () => {
      setArchivedLoading(true);
      setError("");
      try {
        const loaded = await fetchProjectList(apiUrl, accessToken, true);
        if (!ignore) setArchivedProjects(loaded);
      } catch (currentError) {
        if (!ignore) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : "No se pudieron cargar los proyectos archivados",
          );
        }
      } finally {
        if (!ignore) setArchivedLoading(false);
      }
    };

    void loadArchived();
    return () => {
      ignore = true;
    };
  }, [accessToken, apiUrl, archivedOnly]);

  useEffect(() => {
    if (selectedProjectId === null) {
      setProjectDetail(null);
      return;
    }

    let ignore = false;
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await requestJson<Project>(
          apiUrl,
          accessToken,
          `/projects/${selectedProjectId}`,
        );
        if (!ignore) setProjectDetail(detail);
      } catch (currentError) {
        if (!ignore) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : "No se pudo cargar el proyecto",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadDetail();
    return () => {
      ignore = true;
    };
  }, [accessToken, apiUrl, selectedProjectId]);

  const refreshDetail = async (projectId: number) => {
    const detail = await requestJson<Project>(
      apiUrl,
      accessToken,
      `/projects/${projectId}`,
    );
    setProjectDetail(detail);
  };

  const runMutation = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo completar la operación",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = async (project: Project) => {
    await onProjectsChanged();
    setShowCreate(false);
    setSelectedProjectId(project.id);
    setNotice("Proyecto creado con sus cuatro fases predeterminadas.");
  };

  const handleUpdated = async () => {
    if (!projectDetail) return;
    await onProjectsChanged();
    await refreshDetail(projectDetail.id);
    setEditing(false);
  };

  const archiveProject = async () => {
    if (!projectDetail) return;
    const confirmed = window.confirm(
      `¿Archivar “${projectDetail.name}”? Se conservarán su equipo, fases e historial.`,
    );
    if (!confirmed) return;

    await runMutation(async () => {
      await requestJson<Project>(
        apiUrl,
        accessToken,
        `/projects/${projectDetail.id}/archive`,
        { method: "PATCH" },
      );
      await onProjectsChanged();
      setSelectedProjectId(null);
    }, "Proyecto archivado. Solo aparecerá al solicitar proyectos archivados.");
  };

  if (selectedProjectId !== null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setSelectedProjectId(null);
            setEditing(false);
            setError("");
          }}
          className="mb-7 text-sm font-bold text-indigo-300 hover:text-indigo-200"
        >
          ← Volver a proyectos
        </button>
        <Feedback error={error} notice={notice} />
        {projectDetail ? (
          editing ? (
            <ProjectForm
              mode="edit"
              project={projectDetail}
              areas={areas}
              apiUrl={apiUrl}
              accessToken={accessToken}
              loading={loading}
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                await runMutation(
                  handleUpdated,
                  "Información y estado del proyecto actualizados.",
                );
              }}
            />
          ) : (
            <ProjectDetail
              project={projectDetail}
              portfolioProjects={experienceProjects}
              members={members}
              canManage={canManage && !projectDetail.isArchived}
              loading={loading}
              apiUrl={apiUrl}
              accessToken={accessToken}
              onEdit={() => setEditing(true)}
              onArchive={archiveProject}
              onRefresh={async (message) => {
                await runMutation(async () => {
                  await refreshDetail(projectDetail.id);
                  await onProjectsChanged();
                }, message);
              }}
              onError={setError}
            />
          )
        ) : (
          <LoadingBlock />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7478ff]">
            Portafolio
          </p>
          <h1 className="mt-2 text-4xl font-black">Proyectos</h1>
          <p className="mt-3 text-sm text-white/50">
            {archivedOnly
              ? "Vista explícita de proyectos archivados."
              : "Los proyectos archivados se excluyen de esta vista activa."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setArchivedOnly((current) => !current);
              setNotice("");
              setError("");
            }}
            className="h-10 rounded-md border border-white/15 px-4 text-sm font-bold hover:bg-white/8"
          >
            {archivedOnly ? "Ver activos" : "Ver archivados"}
          </button>
          {canManage && !archivedOnly && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-10 rounded-md bg-[#7478ff] px-5 text-sm font-bold text-white hover:bg-[#6569e8]"
            >
              + Crear proyecto
            </button>
          )}
        </div>
      </div>

      <Feedback error={error} notice={notice} />

      {showCreate && (
        <div className="mb-10 rounded-md border border-indigo-400/30 bg-[#151620] p-6 sm:p-8">
          <ProjectForm
            mode="create"
            areas={areas.filter((area) => !area.isArchived)}
            apiUrl={apiUrl}
            accessToken={accessToken}
            loading={loading}
            onCancel={() => setShowCreate(false)}
            onSaved={async (project) => {
              await runMutation(
                () => handleCreated(project),
                "Proyecto creado correctamente.",
              );
            }}
          />
        </div>
      )}

      <div className="grid gap-3 rounded-md border border-white/10 bg-[#151620] p-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Buscar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, área..."
            className={inputClass}
          />
        </Field>
        <Field label="Estado">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Área">
          <select
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Etiqueta">
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
              setAreaFilter("");
              setLabelFilter("");
            }}
            className="h-10 w-full rounded-md bg-white/8 text-sm font-bold hover:bg-white/12"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {(loading || (archivedOnly && archivedLoading)) && (
        <p className="mt-5 text-sm text-white/50">Actualizando…</p>
      )}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => setSelectedProjectId(project.id)}
          />
        ))}
      </div>
      {!loading && !archivedLoading && filteredProjects.length === 0 && (
        <div className="mt-8 rounded-md border border-dashed border-white/15 p-10 text-center text-sm text-white/45">
          No hay proyectos que coincidan con los filtros.
        </div>
      )}
    </div>
  );
}

function ProjectForm({
  mode,
  project,
  areas,
  apiUrl,
  accessToken,
  loading,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  project?: Project;
  areas: Area[];
  apiUrl: string;
  accessToken: string;
  loading: boolean;
  onCancel: () => void;
  onSaved: (project: Project) => Promise<void>;
}) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    project
      ? {
          name: project.name,
          description: project.description ?? "",
          startDate: project.startDate ?? "",
          endDate: project.endDate ?? "",
          areaId: String(project.areaId ?? project.area?.id ?? ""),
          labels: project.labels?.map((label) => label.name).join(", ") ?? "",
          status: project.status,
        }
      : { ...EMPTY_PROJECT_FORM, areaId: String(areas[0]?.id ?? "") },
  );
  const [formError, setFormError] = useState("");

  const update = (field: keyof ProjectFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      setFormError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    const body = {
      name: values.name,
      description: values.description || (mode === "edit" ? null : undefined),
      startDate: values.startDate || (mode === "edit" ? null : undefined),
      endDate: values.endDate || (mode === "edit" ? null : undefined),
      areaId: Number(values.areaId),
      labels: parseLabels(values.labels),
      ...(mode === "edit" ? { status: values.status } : {}),
    };

    try {
      const saved = await requestJson<Project>(
        apiUrl,
        accessToken,
        mode === "create" ? "/projects" : `/projects/${project?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(body),
        },
      );
      await onSaved(saved);
    } catch (currentError) {
      setFormError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo guardar el proyecto",
      );
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="text-2xl font-black">
        {mode === "create" ? "Nuevo proyecto" : `Editar ${project?.name}`}
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Todo proyecto debe pertenecer a exactamente un área.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Nombre">
          <input
            required
            maxLength={255}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Área">
          <select
            required
            value={values.areaId}
            onChange={(event) => update("areaId", event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona un área
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de inicio">
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Fecha de fin">
          <input
            type="date"
            value={values.endDate}
            onChange={(event) => update("endDate", event.target.value)}
            className={inputClass}
          />
        </Field>
        {mode === "edit" && (
          <Field label="Estado">
            <select
              value={values.status}
              onChange={(event) => update("status", event.target.value)}
              className={inputClass}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Etiquetas (separadas por comas)">
          <input
            value={values.labels}
            onChange={(event) => update("labels", event.target.value)}
            placeholder="Backend, Comunidad, Eventos"
            className={inputClass}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción">
            <textarea
              maxLength={2000}
              rows={4}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              className={`${inputClass} h-auto py-3`}
            />
          </Field>
        </div>
      </div>
      {formError && (
        <p className="mt-5 rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {formError}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white/8 px-5 py-2 text-sm font-bold hover:bg-white/12"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || areas.length === 0}
          className="rounded-md bg-[#7478ff] px-5 py-2 text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar proyecto"}
        </button>
      </div>
    </form>
  );
}

function ProjectDetail({
  project,
  portfolioProjects,
  members,
  canManage,
  loading,
  apiUrl,
  accessToken,
  onEdit,
  onArchive,
  onRefresh,
  onError,
}: {
  project: Project;
  portfolioProjects: Project[];
  members: Member[];
  canManage: boolean;
  loading: boolean;
  apiUrl: string;
  accessToken: string;
  onEdit: () => void;
  onArchive: () => Promise<void>;
  onRefresh: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <div>
      <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded px-3 py-1 text-xs font-bold ${
                STATUS_STYLES[project.isArchived ? "archived" : project.status]
              }`}
            >
              {project.isArchived ? "Archivado" : STATUS_LABELS[project.status]}
            </span>
            <span className="text-sm text-white/50">
              {project.area?.name ?? "Área no disponible"}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-black">{project.name}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-white/60">
            {project.description || "Sin descripción."}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md bg-[#7478ff] px-5 py-2 text-sm font-bold"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void onArchive()}
              className="rounded-md border border-rose-400/30 px-5 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/10"
            >
              Archivar
            </button>
          </div>
        )}
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <InfoCard label="Inicio" value={project.startDate || "Sin definir"} />
        <InfoCard label="Fin" value={project.endDate || "Sin definir"} />
        <InfoCard
          label="Equipo"
          value={`${project.memberships?.length ?? 0} miembros`}
        />
      </div>

      {!!project.labels?.length && (
        <div className="mt-6 flex flex-wrap gap-2">
          {project.labels.map((label) => (
            <span
              key={label.id ?? label.name}
              className="rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-bold text-indigo-200"
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-8 2xl:grid-cols-[1.1fr_0.9fr]">
        <TeamPanel
          project={project}
          portfolioProjects={portfolioProjects}
          members={members}
          canManage={canManage}
          loading={loading}
          apiUrl={apiUrl}
          accessToken={accessToken}
          onRefresh={onRefresh}
          onError={onError}
        />
        <PhasesPanel
          project={project}
          canManage={canManage}
          loading={loading}
          apiUrl={apiUrl}
          accessToken={accessToken}
          onRefresh={onRefresh}
          onError={onError}
        />
      </div>

      {!!project.links?.length && (
        <section className="mt-8 rounded-md border border-white/10 bg-[#20212c] p-6">
          <h2 className="text-xl font-black">Enlaces</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {project.links.map((link) => (
              <a
                key={link.id ?? link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-white/8 px-4 py-2 text-sm font-bold text-indigo-200 hover:bg-white/12"
              >
                {link.name}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TeamPanel({
  project,
  portfolioProjects,
  members,
  canManage,
  loading,
  apiUrl,
  accessToken,
  onRefresh,
  onError,
}: {
  project: Project;
  portfolioProjects: Project[];
  members: Member[];
  canManage: boolean;
  loading: boolean;
  apiUrl: string;
  accessToken: string;
  onRefresh: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [showCandidates, setShowCandidates] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);

  const projectAreaId = project.areaId ?? project.area?.id;
  const assignedIds = new Set(
    project.memberships?.map((membership) => membership.memberId) ?? [],
  );
  const areaCandidates = members.filter(
    (member) =>
      projectAreaId !== undefined &&
      memberAreaIds(member).includes(projectAreaId) &&
      !assignedIds.has(member.id) &&
      member.availabilityStatus === "available",
  );
  const skills = Array.from(
    new Set(areaCandidates.flatMap((member) => member.skills?.map((skill) => skill.name) ?? [])),
  ).sort((a, b) => a.localeCompare(b));
  const cycles = Array.from(
    new Set(
      areaCandidates
        .map((member) => member.cycle)
        .filter((cycle): cycle is number => typeof cycle === "number"),
    ),
  ).sort((a, b) => a - b);
  const majors = Array.from(
    new Set(areaCandidates.map((member) => member.major).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const projectLabels = getPortfolioLabelNames(portfolioProjects);

  const candidates = areaCandidates
    .filter((member) => {
      const memberSkills = member.skills?.map((skill) => normalize(skill.name)) ?? [];
      const matchesQuery =
        !normalize(candidateQuery) ||
        normalize(`${memberName(member)} ${member.major}`).includes(
          normalize(candidateQuery),
        );
      const matchesSkill =
        !skillFilter || memberSkills.includes(normalize(skillFilter));
      const memberProjectLabels = getMemberProjectLabelNames(
        portfolioProjects,
        member.id,
      ).map(normalize);
      const matchesProjectLabel =
        !labelFilter ||
        memberProjectLabels.includes(normalize(labelFilter));
      const matchesCycle =
        !cycleFilter || member.cycle === Number(cycleFilter);
      const matchesMajor = !majorFilter || member.major === majorFilter;
      return (
        matchesQuery &&
        matchesSkill &&
        matchesProjectLabel &&
        matchesCycle &&
        matchesMajor
      );
    })
    .sort((a, b) => {
      const activityOrder =
        Number(a.activityStatus === "inactive") -
        Number(b.activityStatus === "inactive");
      return activityOrder || memberName(a).localeCompare(memberName(b));
    });

  const mutate = async (
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
    message?: string,
  ) => {
    onError("");
    try {
      await requestJson<void>(apiUrl, accessToken, path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      await onRefresh(message ?? "Equipo actualizado.");
    } catch (currentError) {
      onError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo actualizar el equipo",
      );
    }
  };

  return (
    <section className="rounded-md border border-white/10 bg-[#20212c] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Equipo del proyecto</h2>
          <p className="mt-1 text-xs text-white/45">
            Solo se seleccionan miembros disponibles de esta área.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCandidates((current) => !current)}
            className="rounded-md bg-[#7478ff] px-4 py-2 text-xs font-bold"
          >
            {showCandidates ? "Cerrar" : "+ Agregar"}
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {project.memberships?.map((membership) => (
          <div
            key={membership.id}
            className="flex flex-col gap-3 rounded-md bg-[#171822] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-bold">
                {membership.member
                  ? memberName(membership.member)
                  : `Miembro #${membership.memberId}`}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {membership.member?.major ?? "Perfil restringido"}
                {membership.member?.activityStatus === "inactive"
                  ? " · Inactivo"
                  : ""}
              </p>
            </div>
            {canManage ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Rol de ${membership.member ? memberName(membership.member) : membership.memberId}`}
                  value={membership.role}
                  disabled={loading}
                  onChange={(event) =>
                    void mutate(
                      `/projects/${project.id}/members/${membership.memberId}`,
                      "PATCH",
                      { role: event.target.value },
                      "Rol del proyecto actualizado.",
                    )
                  }
                  className="h-9 rounded-md border border-white/10 bg-[#292a36] px-3 text-xs"
                >
                  {Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Retirar a ${
                          membership.member
                            ? memberName(membership.member)
                            : `miembro #${membership.memberId}`
                        } del proyecto?`,
                      )
                    ) {
                      void mutate(
                        `/projects/${project.id}/members/${membership.memberId}`,
                        "DELETE",
                        undefined,
                        "Miembro retirado del proyecto.",
                      );
                    }
                  }}
                  className="rounded-md px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"
                >
                  Retirar
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold text-indigo-200">
                {PROJECT_ROLE_LABELS[membership.role]}
              </span>
            )}
          </div>
        ))}
        {!project.memberships?.length && (
          <p className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-white/40">
            Este proyecto aún no tiene equipo.
          </p>
        )}
      </div>

      {showCandidates && canManage && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="font-bold">Seleccionar candidato</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Buscar candidato"
              value={candidateQuery}
              onChange={(event) => setCandidateQuery(event.target.value)}
              placeholder="Buscar por nombre..."
              className={inputClass}
            />
            <select
              aria-label="Filtrar por skill"
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Todas las skills</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por etiqueta del proyecto"
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Todas las etiquetas</option>
              {projectLabels.map((label) => (
                <option key={label} value={label}>
                  Proyecto previo: {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por carrera"
              value={majorFilter}
              onChange={(event) => setMajorFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Todas las carreras</option>
              {majors.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
            {cycles.length > 0 ? (
              <select
                aria-label="Filtrar por ciclo"
                value={cycleFilter}
                onChange={(event) => setCycleFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">Todos los ciclos</option>
                {cycles.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    Ciclo {cycle}
                  </option>
                ))}
              </select>
            ) : (
              <p className="flex h-10 items-center rounded-md border border-dashed border-white/10 px-3 text-xs text-white/40">
                Ciclo pendiente en el contrato de miembros
              </p>
            )}
            <select
              aria-label="Rol inicial en el proyecto"
              value={role}
              onChange={(event) => setRole(event.target.value as ProjectRole)}
              className={inputClass}
            >
              {Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  Rol: {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {candidates.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={loading || pendingMemberId !== null}
                onClick={async () => {
                  setPendingMemberId(member.id);
                  await mutate(
                    `/projects/${project.id}/members`,
                    "POST",
                    { memberId: member.id, role },
                    `${memberName(member)} fue agregado al proyecto.`,
                  );
                  setPendingMemberId(null);
                }}
                className="flex w-full items-center justify-between rounded-md bg-[#171822] p-4 text-left hover:bg-[#292a36] disabled:opacity-50"
              >
                <span>
                  <span className="block text-sm font-bold">
                    {memberName(member)}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {member.major}
                    {member.cycle ? ` · Ciclo ${member.cycle}` : ""}
                    {member.activityStatus === "inactive" ? " · Inactivo" : ""}
                  </span>
                </span>
                <span className="text-xs font-bold text-indigo-300">
                  {pendingMemberId === member.id ? "Agregando…" : "Agregar"}
                </span>
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="rounded-md border border-dashed border-white/10 p-5 text-center text-xs text-white/40">
                No hay miembros disponibles que cumplan los filtros. Los no
                disponibles están excluidos.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PhasesPanel({
  project,
  canManage,
  loading,
  apiUrl,
  accessToken,
  onRefresh,
  onError,
}: {
  project: Project;
  canManage: boolean;
  loading: boolean;
  apiUrl: string;
  accessToken: string;
  onRefresh: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const phases = [...(project.phases ?? [])].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const mutate = async (
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
    message?: string,
  ): Promise<boolean> => {
    onError("");
    try {
      await requestJson<void>(apiUrl, accessToken, path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      await onRefresh(message ?? "Fases actualizadas.");
      return true;
    } catch (currentError) {
      onError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudieron actualizar las fases",
      );
      return false;
    }
  };

  const reorder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= phases.length) return;
    const phaseIds = phases.map((phase) => phase.id);
    [phaseIds[index], phaseIds[targetIndex]] = [
      phaseIds[targetIndex],
      phaseIds[index],
    ];
    await mutate(
      `/projects/${project.id}/phases/reorder`,
      "PATCH",
      { phaseIds },
      "Orden de fases actualizado.",
    );
  };

  return (
    <section className="rounded-md border border-white/10 bg-[#20212c] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Fases</h2>
          <p className="mt-1 text-xs text-white/45">
            Estructura persistida del proyecto.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAdd((current) => !current)}
            className="rounded-md bg-white/8 px-4 py-2 text-xs font-bold hover:bg-white/12"
          >
            {showAdd ? "Cancelar" : "+ Fase"}
          </button>
        )}
      </div>

      {showAdd && canManage && (
        <form
          className="mt-5 rounded-md border border-white/10 bg-[#171822] p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const succeeded = await mutate(
              `/projects/${project.id}/phases`,
              "POST",
              {
                name: newName,
                ...(newDescription ? { description: newDescription } : {}),
              },
              "Fase agregada.",
            );
            if (succeeded) {
              setNewName("");
              setNewDescription("");
              setShowAdd(false);
            }
          }}
        >
          <input
            required
            maxLength={255}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nombre de la fase"
            className={inputClass}
          />
          <textarea
            maxLength={2000}
            rows={2}
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Descripción opcional"
            className={`${inputClass} mt-3 h-auto py-2`}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 rounded-md bg-[#7478ff] px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            Guardar fase
          </button>
        </form>
      )}

      <ol className="mt-6 space-y-3">
        {phases.map((phase, index) => (
          <li key={phase.id} className="rounded-md bg-[#171822] p-4">
            {editing?.id === phase.id ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const succeeded = await mutate(
                    `/projects/${project.id}/phases/${phase.id}`,
                    "PATCH",
                    {
                      name: editName,
                      description: editDescription,
                    },
                    "Fase actualizada.",
                  );
                  if (succeeded) setEditing(null);
                }}
              >
                <input
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className={inputClass}
                />
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className={`${inputClass} mt-2 h-auto py-2`}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    className="rounded bg-[#7478ff] px-3 py-1.5 text-xs font-bold"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded bg-white/8 px-3 py-1.5 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7478ff] text-xs font-black">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{phase.name}</p>
                  {phase.description && (
                    <p className="mt-1 text-xs leading-5 text-white/45">
                      {phase.description}
                    </p>
                  )}
                  {canManage && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <SmallButton
                        label="↑"
                        disabled={loading || index === 0}
                        onClick={() => void reorder(index, -1)}
                      />
                      <SmallButton
                        label="↓"
                        disabled={loading || index === phases.length - 1}
                        onClick={() => void reorder(index, 1)}
                      />
                      <SmallButton
                        label="Editar"
                        disabled={loading}
                        onClick={() => {
                          setEditing(phase);
                          setEditName(phase.name);
                          setEditDescription(phase.description ?? "");
                        }}
                      />
                      <SmallButton
                        label="Eliminar"
                        danger
                        disabled={loading || phases.length <= 1}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar la fase “${phase.name}”?`,
                            )
                          ) {
                            void mutate(
                              `/projects/${project.id}/phases/${phase.id}`,
                              "DELETE",
                              undefined,
                              "Fase eliminada.",
                            );
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {phases.length === 0 && <LoadingBlock />}
    </section>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const status = project.isArchived ? "archived" : project.status;
  return (
    <article className="rounded-md border border-white/10 bg-[#20212c] p-6 transition hover:border-indigo-400/35">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            {project.area?.name ?? "Sin área"}
          </p>
          <h2 className="mt-2 truncate text-2xl font-black">{project.name}</h2>
        </div>
        <span
          className={`shrink-0 rounded px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}
        >
          {status === "archived" ? "Archivado" : STATUS_LABELS[status]}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-white/55">
        {project.description ?? "Sin descripción."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {project.labels?.slice(0, 4).map((label) => (
          <span
            key={label.id ?? label.name}
            className="rounded-full bg-white/7 px-3 py-1 text-xs text-white/60"
          >
            {label.name}
          </span>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4">
        <span className="text-xs text-white/40">
          {project.phases?.length ?? 0} fases ·{" "}
          {project.memberships?.length ?? 0} miembros
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-bold text-indigo-300 hover:text-indigo-200"
        >
          Ver detalle →
        </button>
      </div>
    </article>
  );
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-6 rounded-md border border-lime-500/25 bg-lime-500/10 px-4 py-3 text-sm text-lime-100"
        >
          {notice}
        </p>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-white/55">{label}</span>
      {children}
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#20212c] p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-white/35">
        {label}
      </p>
      <p className="mt-2 font-bold">{value}</p>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  disabled,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2.5 py-1 text-xs font-bold disabled:opacity-30 ${
        danger
          ? "text-rose-300 hover:bg-rose-500/10"
          : "bg-white/7 hover:bg-white/12"
      }`}
    >
      {label}
    </button>
  );
}

function LoadingBlock() {
  return (
    <p className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
      Cargando…
    </p>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-white/10 bg-[#292a36] px-3 text-sm text-white outline-none focus:border-indigo-400";
