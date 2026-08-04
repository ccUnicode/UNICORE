"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  appendTaskComment,
  CollaborationMember,
  formatCollaborationTimestamp,
  TaskCommentItem,
} from "./task-collaboration";

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
  role: string;
  isEligible?: boolean;
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
  role: "representative" | "subrepresentative" | "member";
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

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

type TaskAssignee = {
  id: number;
  taskId: number;
  memberId: number;
  member?: Member;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: number;
  phaseId: number | null;
  phase?: ProjectPhase | null;
  assignees?: TaskAssignee[];
  comments?: TaskCommentItem[];
  statusHistory?: TaskStatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

type TaskStatusHistoryItem = {
  id: number;
  taskId: number;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  actorId: number;
  actor: CollaborationMember;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
};

type TaskFormValues = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  phaseId: string;
  assigneeIds: number[];
};

type Props = {
  projects: Project[];
  accessToken: string;
  apiUrl: string;
  currentMember: Member;
};

const PRIORITY_INFO: Record<
  TaskPriority,
  { label: string; num: string; style: string }
> = {
  low: {
    label: "Baja",
    num: "1",
    style: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  medium: {
    label: "Media",
    num: "2",
    style: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  high: {
    label: "Alta",
    num: "3",
    style: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  },
  urgent: {
    label: "Urgente",
    num: "4",
    style: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
};

const STATUS_INFO: Record<TaskStatus, { label: string; style: string }> = {
  todo: {
    label: "Por hacer",
    style: "bg-zinc-800 text-zinc-300 border border-zinc-700/55",
  },
  in_progress: {
    label: "En progreso",
    style: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  },
  in_review: {
    label: "En revisión",
    style: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  done: {
    label: "Completada",
    style: "bg-lime-500/10 text-lime-400 border border-lime-500/20",
  },
};

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["todo", "in_review"],
  in_review: ["in_progress", "done"],
  done: ["in_review"],
};

const EMPTY_TASK_FORM: TaskFormValues = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  phaseId: "",
  assigneeIds: [],
};

function getMemberAreaIds(member: Member): number[] {
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  member.memberships?.forEach((membership) => {
    if (typeof membership.areaId === "number") ids.add(membership.areaId);
  });
  return [...ids];
}

function memberName(
  member: Pick<Member, "firstNames" | "lastNames">,
): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

function formatDateSpanish(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha límite";
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${months[monthIndex] || parts[1]} ${year}`;
  }
  return dateStr;
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
      // Ignore
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

export default function TaskManagement({
  projects,
  accessToken,
  apiUrl,
  currentMember,
}: Props) {
  // Scopes allowed projects for the user
  const allowedProjects = useMemo(() => {
    const role = currentMember.role?.toLowerCase();
    if (role === "presidencia") {
      return projects;
    }
    if (role === "directiva_de_area") {
      const myAreaIds = getMemberAreaIds(currentMember);
      return projects.filter((project) => {
        const pAreaId = project.areaId ?? project.area?.id;
        return pAreaId !== undefined && myAreaIds.includes(pAreaId);
      });
    }
    // Regular member
    return projects.filter((project) =>
      project.memberships?.some((m) => m.memberId === currentMember.id),
    );
  }, [projects, currentMember]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Form values state
  const [formValues, setFormValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);

  const [selectedProjectDetails, setSelectedProjectDetails] = useState<Project | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    setSelectedProjectDetails(null); // Clear on select or reset
    if (selectedProjectId === null) {
      return;
    }
    let ignore = false;
    const loadProjectDetails = async () => {
      try {
        const details = await requestJson<Project>(
          apiUrl,
          accessToken,
          `/projects/${selectedProjectId}`,
        );
        if (!ignore) {
          setSelectedProjectDetails(details);
        }
      } catch (err) {
        console.warn("Failed to load project details: ", err);
        if (!ignore) {
          setSelectedProjectDetails(null); // Clear on request failure
        }
      }
    };
    void loadProjectDetails();
    return () => {
      ignore = true;
    };
  }, [selectedProjectId, apiUrl, accessToken]);

  useEffect(() => {
    let ignore = false;
    const loadAllMembers = async () => {
      try {
        const data = await requestJson<Member[]>(
          apiUrl,
          accessToken,
          "/members",
        );
        if (!ignore) {
          setAllMembers(data);
        }
      } catch (err) {
        console.warn("Failed to load members: ", err);
      }
    };
    if (accessToken && accessToken !== "mock-token") {
      void loadAllMembers();
    }
    return () => {
      ignore = true;
    };
  }, [apiUrl, accessToken]);

  const selectedProject = useMemo(() => {
    return allowedProjects.find((p) => p.id === selectedProjectId) ?? null;
  }, [allowedProjects, selectedProjectId]);

  // Helper to ensure we only use loaded details that match the currently selected project ID
  const activeProjectDetails = useMemo(() => {
    if (selectedProjectDetails && selectedProjectDetails.id === selectedProjectId) {
      return selectedProjectDetails;
    }
    return null;
  }, [selectedProjectDetails, selectedProjectId]);

  const projectPhases = useMemo(() => {
    const projectToUse = activeProjectDetails || selectedProject;
    return projectToUse?.phases ?? [];
  }, [activeProjectDetails, selectedProject]);

  const selectedProjectMembership = useMemo(() => {
    const projectToUse = activeProjectDetails || selectedProject;
    if (!projectToUse || !currentMember) return null;
    return (
      projectToUse.memberships?.find(
        (m) => m.memberId === currentMember.id,
      ) ?? null
    );
  }, [activeProjectDetails, selectedProject, currentMember]);

  // Determine permissions
  const canManage = useMemo(() => {
    const projectToUse = activeProjectDetails || selectedProject;
    if (!currentMember || !projectToUse) return false;
    const role = currentMember.role?.toLowerCase();
    if (role === "presidencia") return true;
    if (role === "directiva_de_area") {
      const myAreaIds = getMemberAreaIds(currentMember);
      const pAreaId = projectToUse.areaId ?? projectToUse.area?.id;
      return pAreaId !== undefined && myAreaIds.includes(pAreaId);
    }
    if (selectedProjectMembership) {
      const pRole = selectedProjectMembership.role;
      return pRole === "representative" || pRole === "subrepresentative";
    }
    return false;
  }, [currentMember, activeProjectDetails, selectedProject, selectedProjectMembership]);

  const canChangeStatus = useMemo(() => {
    const projectToUse = activeProjectDetails || selectedProject;
    if (!currentMember || !projectToUse) return false;
    const role = currentMember.role?.toLowerCase();
    if (role === "presidencia") return true;
    if (role === "directiva_de_area") {
      const myAreaIds = getMemberAreaIds(currentMember);
      const pAreaId = projectToUse.areaId ?? projectToUse.area?.id;
      return pAreaId !== undefined && myAreaIds.includes(pAreaId);
    }
    return !!selectedProjectMembership;
  }, [currentMember, activeProjectDetails, selectedProject, selectedProjectMembership]);

  // Project team members (for assignments)
  const projectMembers = useMemo(() => {
    const projectToUse = activeProjectDetails || selectedProject;
    if (!projectToUse) return [];

    const projectMemberIds = new Set(
      projectToUse.memberships?.map((m) => m.memberId) ?? []
    );

    if (allMembers.length > 0) {
      return allMembers
        .filter((m) => projectMemberIds.has(m.id))
        .map((m) => ({
          ...m,
          isEligible:
            m.activityStatus === "active" &&
            m.availabilityStatus === "available",
        }));
    }

    return (
      projectToUse.memberships
        ?.map((m) => m.member)
        .filter((m): m is Member => !!m) ?? []
    );
  }, [activeProjectDetails, selectedProject, allMembers]);

  // Eligible members: active AND available
  const eligibleMembers = useMemo(() => {
    return projectMembers.filter((m) => m.isEligible !== false);
  }, [projectMembers]);

  // Default project selection
  useEffect(() => {
    if (allowedProjects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(allowedProjects[0].id);
    }
  }, [allowedProjects, selectedProjectId]);

  // Load tasks when project or filters change
  // Reset page when project or filters change
  useEffect(() => {
    setPage(1);
  }, [selectedProjectId, statusFilter, priorityFilter, debouncedSearch]);

  const loadTasks = useCallback(async () => {
    if (selectedProjectId === null) {
      setTasks([]);
      setMeta(null);
      return;
    }
    setTasksLoading(true);
    setError("");
    try {
      let path = `/tasks?projectId=${selectedProjectId}&page=${page}&limit=10`;
      if (statusFilter) path += `&status=${statusFilter}`;
      if (priorityFilter) path += `&priority=${priorityFilter}`;
      if (debouncedSearch.trim()) {
        path += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      }

      const payload = await requestJson<PaginatedResponse<Task>>(
        apiUrl,
        accessToken,
        path,
      );
      setTasks(payload.data);
      setMeta(payload.meta);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudieron cargar las tareas",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [
    selectedProjectId,
    statusFilter,
    priorityFilter,
    debouncedSearch,
    page,
    apiUrl,
    accessToken,
  ]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Load task detail when selection changes
  useEffect(() => {
    if (selectedTaskId === null) {
      setTaskDetail(null);
      return;
    }

    let ignore = false;
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await requestJson<Task>(
          apiUrl,
          accessToken,
          `/tasks/${selectedTaskId}`,
        );
        if (!ignore) setTaskDetail(detail);
      } catch (currentError) {
        if (!ignore) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : "No se pudo cargar el detalle de la tarea",
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
  }, [selectedTaskId, apiUrl, accessToken, selectedProjectId]);

  // Search filter
  // Search filtering is now handled on the backend
  const filteredTasks = tasks;

  const handleCreateClick = () => {
    setFormValues({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      phaseId: "",
      assigneeIds: [],
    });
    setEditing(false);
    setShowCreate(true);
    setError("");
  };

  const handleEditClick = () => {
    if (!taskDetail) return;
    const taskAssigneeIds =
      taskDetail.assignees?.map((ta) => ta.memberId) ?? [];

    setFormValues({
      title: taskDetail.title,
      description: taskDetail.description ?? "",
      priority: taskDetail.priority,
      dueDate: taskDetail.dueDate ?? "",
      phaseId: taskDetail.phaseId ? String(taskDetail.phaseId) : "",
      assigneeIds: taskAssigneeIds,
    });
    setShowCreate(false);
    setEditing(true);
    setError("");
  };

  const handleClosePanel = () => {
    setShowCreate(false);
    setEditing(false);
    setError("");
  };

  // Status transitions
  const handleTransition = async (nextStatus: TaskStatus) => {
    if (!taskDetail || nextStatus === taskDetail.status) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await requestJson<Task>(
        apiUrl,
        accessToken,
        `/tasks/${taskDetail.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setNotice(`Estado de la tarea cambiado a: ${STATUS_INFO[nextStatus].label}`);
      // Refresh list & detail
      await loadTasks();
      const detail = await requestJson<Task>(
        apiUrl,
        accessToken,
        `/tasks/${taskDetail.id}`,
      );
      setTaskDetail(detail);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Error al cambiar el estado de la tarea",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!taskDetail || !commentContent.trim()) return;

    setCommentSubmitting(true);
    setError("");
    setNotice("");
    try {
      const createdComment = await requestJson<TaskCommentItem>(
        apiUrl,
        accessToken,
        `/tasks/${taskDetail.id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: commentContent }),
        },
      );
      setTaskDetail((current) =>
        current
          ? {
              ...current,
              comments: appendTaskComment(
                current.comments ?? [],
                createdComment,
              ),
            }
          : current,
      );
      setCommentContent("");
      setNotice("Comentario agregado");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo agregar el comentario",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Save creation / updates
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (showCreate) {
        // Validation: Must select at least 1 assignee
        if (formValues.assigneeIds.length === 0) {
          throw new Error("Debes asignar al menos a un responsable.");
        }

        const bodyPayload = {
          projectId: selectedProjectId,
          title: formValues.title,
          description: formValues.description || null,
          priority: formValues.priority,
          dueDate: formValues.dueDate || null,
          phaseId: formValues.phaseId ? Number(formValues.phaseId) : null,
          assigneeIds: formValues.assigneeIds,
        };

        const newTask = await requestJson<Task>(
          apiUrl,
          accessToken,
          "/tasks",
          {
            method: "POST",
            body: JSON.stringify(bodyPayload),
          },
        );

        setNotice("Tarea creada con éxito");
        setShowCreate(false);
        await loadTasks();
        setSelectedTaskId(newTask.id);
      } else if (editing && taskDetail) {
        // Validation: Must select at least 1 assignee
        if (formValues.assigneeIds.length === 0) {
          throw new Error("Debes asignar al menos a un responsable.");
        }

        const bodyPayload = {
          title: formValues.title,
          description: formValues.description || null,
          priority: formValues.priority,
          dueDate: formValues.dueDate || null,
          phaseId: formValues.phaseId ? Number(formValues.phaseId) : null,
        };

        // 1. Update task detail
        await requestJson<Task>(
          apiUrl,
          accessToken,
          `/tasks/${taskDetail.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(bodyPayload),
          },
        );

        // 2. Update assignees
        await requestJson<Task>(
          apiUrl,
          accessToken,
          `/tasks/${taskDetail.id}/assignees`,
          {
            method: "PATCH",
            body: JSON.stringify({ memberIds: formValues.assigneeIds }),
          },
        );

        setNotice("Tarea modificada con éxito");
        setEditing(false);
        await loadTasks();
        // Reload detail
        const detail = await requestJson<Task>(
          apiUrl,
          accessToken,
          `/tasks/${taskDetail.id}`,
        );
        setTaskDetail(detail);
      }
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Error al guardar los cambios",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAssigneeCheckboxChange = (memberId: number, checked: boolean) => {
    setFormValues((prev) => {
      const currentIds = [...prev.assigneeIds];
      if (checked) {
        if (!currentIds.includes(memberId)) currentIds.push(memberId);
      } else {
        const index = currentIds.indexOf(memberId);
        if (index > -1) currentIds.splice(index, 1);
      }
      return { ...prev, assigneeIds: currentIds };
    });
  };

  if (allowedProjects.length === 0) {
    return (
      <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-10 text-center text-white/55">
        <p className="text-lg font-bold">Sin Proyectos</p>
        <p className="mt-2 text-sm">
          No perteneces a ningún proyecto activo con acceso a las Tareas de UNICORE.
        </p>
      </div>
    );
  }

  // LIST VIEW: If not viewing/editing/creating details of a specific task
  if (!selectedTaskId && !showCreate) {
    return (
      <div className="space-y-6 text-white bg-[#060610] min-h-screen">
        {/* Header section */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100">Tareas</h1>
          <div className="flex flex-wrap gap-4 items-center">
            {canManage && (
              <button
                type="button"
                onClick={handleCreateClick}
                className="h-10 shrink-0 rounded-md bg-[#4067c9] px-5 text-sm font-bold text-white transition hover:bg-[#5278d5]"
              >
                + Nueva Tarea
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="rounded-md border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-400">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Filter bar exactly as Figma */}
        <div className="flex flex-wrap items-center gap-4 bg-[#0c0d16] border border-[#1e1f2e] rounded-md p-4">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              ⌕
            </span>
            <input
              value={searchQuery}
              placeholder="Buscar tareas..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#4067c9]"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedProjectId || ""}
              onChange={(e) => {
                setSelectedProjectId(Number(e.target.value));
              }}
              className="h-9 rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-xs text-zinc-300 outline-none"
            >
              {allowedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-xs text-zinc-300 outline-none"
            >
              <option value="">Estado</option>
              <option value="todo">Por hacer</option>
              <option value="in_progress">En progreso</option>
              <option value="in_review">En revisión</option>
              <option value="done">Completada</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-xs text-zinc-300 outline-none"
            >
              <option value="">Prioridad</option>
              <option value="low">Baja (1)</option>
              <option value="medium">Media (2)</option>
              <option value="high">Alta (3)</option>
              <option value="urgent">Urgente (4)</option>
            </select>
          </div>
        </div>

        {/* Table exactly as Figma */}
        <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] overflow-hidden">
          {tasksLoading ? (
            <div className="py-20 text-center text-sm text-zinc-400">
              Cargando tareas...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center text-zinc-400">
              No hay tareas que coincidan con los filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1e1f2e]/60 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-[#0c0d16] bg-opacity-75">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Título</th>
                    <th className="px-6 py-4">Proyecto</th>
                    <th className="px-6 py-4">Responsable</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Prioridad</th>
                    <th className="px-6 py-4">Fecha límite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1f2e]/40">
                  {filteredTasks.map((task) => {
                    const taskAssignees =
                      task.assignees
                        ?.map((ta) => ta.member)
                        .filter((m): m is Member => !!m) ?? [];
                    const mainAssignee = taskAssignees[0];

                    return (
                      <tr
                        key={task.id}
                        className="text-sm text-zinc-300 hover:bg-[#161726]/50 transition"
                      >
                        <td className="px-6 py-4 font-mono text-zinc-500 text-xs">
                          #TASK-{task.id}
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(task.id);
                            }}
                            className="hover:text-[#5278d5] text-left transition"
                          >
                            {task.title}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">
                          {selectedProject?.name}
                        </td>
                        <td className="px-6 py-4">
                          {mainAssignee ? (
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-900/65 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                                {mainAssignee.firstNames[0]}
                              </span>
                              <span className="text-zinc-300">
                                {memberName(mainAssignee)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              STATUS_INFO[task.status].style
                            }`}
                          >
                            {STATUS_INFO[task.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            title={PRIORITY_INFO[task.priority].label}
                            className={`grid h-5 w-7 place-items-center rounded-full text-xs font-bold ${
                              PRIORITY_INFO[task.priority].style
                            }`}
                          >
                            {PRIORITY_INFO[task.priority].num}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-xs">
                          {formatDateSpanish(task.dueDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer exactly as Figma */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[#1e1f2e]/60 px-6 py-4 bg-[#0c0d16] bg-opacity-75 text-xs text-zinc-500">
            <span>
              {meta ? (
                `Mostrando ${(meta.page - 1) * meta.limit + 1} a ${Math.min(
                  meta.page * meta.limit,
                  meta.total,
                )} de ${meta.total} Tareas`
              ) : (
                `Mostrando 0 de 0 Tareas`
              )}
            </span>
            {meta && meta.lastPage > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="grid h-7 w-7 place-items-center rounded bg-[#161726] hover:bg-[#1f2033] text-zinc-400 disabled:opacity-30"
                  disabled={page === 1}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                {Array.from({ length: meta.lastPage }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = pNum === page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`grid h-7 w-7 place-items-center rounded font-bold text-xs ${
                        isCurrent
                          ? "bg-[#4067c9] text-white"
                          : "bg-[#161726] text-zinc-400 hover:bg-[#1f2033]"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
                  className="grid h-7 w-7 place-items-center rounded bg-[#161726] hover:bg-[#1f2033] text-zinc-400 disabled:opacity-30"
                  disabled={page === meta.lastPage}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CREATE VIEW: If creating a new task/issue
  if (showCreate || (editing && taskDetail)) {
    return (
      <div className="space-y-6 text-white bg-[#060610] min-h-screen">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100">Tareas</h1>
          <button
            type="button"
            onClick={handleClosePanel}
            className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1.5"
          >
            ‹ Volver a la lista
          </button>
        </div>

        <div className="max-w-3xl rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-6">
            {showCreate ? "Crear Nueva Tarea" : "Modificar Tarea"}
          </h2>

          {error && (
            <div className="mb-6 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleFormSubmit}>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-400">
                Título de la Tarea
              </span>
              <input
                value={formValues.title}
                onChange={(e) =>
                  setFormValues({ ...formValues, title: e.target.value })
                }
                required
                maxLength={255}
                placeholder="Ej. Diseño de flujo de registro"
                className="mt-2 h-10 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#4067c9]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-400">
                Descripción
              </span>
              <textarea
                value={formValues.description}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    description: e.target.value,
                  })
                }
                maxLength={2000}
                rows={5}
                placeholder="Detalle sobre el alcance, requerimientos y entregables..."
                className="mt-2 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#4067c9]"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-400">
                  Prioridad
                </span>
                <select
                  value={formValues.priority}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      priority: e.target.value as TaskPriority,
                    })
                  }
                  className="mt-2 h-10 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-sm text-zinc-300 outline-none"
                >
                  <option value="low">Baja (1)</option>
                  <option value="medium">Media (2)</option>
                  <option value="high">Alta (3)</option>
                  <option value="urgent">Urgente (4)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-400">
                  Fecha Límite
                </span>
                <input
                  type="date"
                  value={formValues.dueDate}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      dueDate: e.target.value,
                    })
                  }
                  className="mt-2 h-10 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-sm text-zinc-300 outline-none focus:border-[#4067c9]"
                />
              </label>
            </div>

            {projectPhases && projectPhases.length > 0 && (
              <label className="block">
                <span className="text-xs font-semibold text-zinc-400">
                  Fase del Proyecto
                </span>
                <select
                  value={formValues.phaseId}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      phaseId: e.target.value,
                    })
                  }
                  className="mt-2 h-10 w-full rounded bg-[#151522] border border-[#1e1f2e]/80 px-3 text-sm text-zinc-300 outline-none"
                >
                  <option value="">Ninguna</option>
                  {projectPhases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Responsables multi checkboxes */}
            <div className="block">
              <span className="text-xs font-semibold text-zinc-400">
                Responsables Asignados (Mínimo 1)
              </span>
              <div className="mt-2 max-h-[160px] overflow-y-auto rounded bg-[#151522] border border-[#1e1f2e]/80 p-3 space-y-2">
                {eligibleMembers.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    No hay miembros activos y disponibles para asignar en este proyecto.
                  </p>
                ) : (
                  eligibleMembers.map((m) => {
                    const isChecked = formValues.assigneeIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleAssigneeCheckboxChange(
                              m.id,
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded border-[#1e1f2e] bg-[#0c0d16] text-[#4067c9] focus:ring-[#4067c9]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {memberName(m)}
                          </p>
                          <p className="text-xs text-zinc-500">{m.major}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-[#1e1f2e]/40">
              <button
                type="submit"
                disabled={loading}
                className="h-10 flex-1 rounded bg-[#4067c9] font-bold text-white transition hover:bg-[#5278d5] disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Tarea"}
              </button>
              <button
                type="button"
                onClick={handleClosePanel}
                className="h-10 px-5 rounded bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // DETAIL VIEW: When a specific task is selected
  const detailAssignees =
    taskDetail?.assignees
      ?.map((ta) => ta.member)
      .filter((m): m is Member => !!m) ?? [];

  return (
    <div className="space-y-6 text-white bg-[#060610] min-h-screen">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100">Tareas</h1>
        <button
          type="button"
          onClick={() => {
            setSelectedTaskId(null);
            setTaskDetail(null);
          }}
          className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1.5"
        >
          ‹ Volver a la lista
        </button>
      </div>

      {notice && (
        <div className="rounded-md border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-400">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {taskDetail ? (
        <div className="space-y-6">
          {/* Tarea summary title and meta bar */}
          <div>
            <span className="text-sm font-mono text-zinc-500">
              #TASK-{taskDetail.id}
            </span>
            <div className="flex items-center justify-between gap-4 mt-2">
              <h2 className="text-3xl font-extrabold text-white">{taskDetail.title}</h2>
              {canManage && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="rounded bg-[#151522] border border-[#1e1f2e]/80 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-[#161726] transition"
                >
                  Editar
                </button>
              )}
            </div>

            {/* Meta tags bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 border-b border-[#1e1f2e]/40 pb-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">Estado:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_INFO[taskDetail.status].style
                  }`}
                >
                  {STATUS_INFO[taskDetail.status].label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">Prioridad:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    PRIORITY_INFO[taskDetail.priority].style
                  }`}
                >
                  {PRIORITY_INFO[taskDetail.priority].num}{" "}
                  {PRIORITY_INFO[taskDetail.priority].label}
                </span>
              </div>

              {taskDetail.createdAt && (
                <div>
                  <span className="text-zinc-500 text-xs">Creado el: </span>
                  <span className="text-zinc-300">
                    {formatDateSpanish(taskDetail.createdAt.split("T")[0])}
                  </span>
                </div>
              )}

              <div>
                <span className="text-zinc-500 text-xs">Fecha límite: </span>
                <span className="text-zinc-300">
                  📅 {formatDateSpanish(taskDetail.dueDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Tab content switcher with split column design */}
          <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
            {/* Left column: Detail Content */}
            <div className="space-y-6">
              {/* Descripción card */}
              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Descripción
                </h3>
                <p className="text-sm leading-7 text-zinc-300 whitespace-pre-line">
                  {taskDetail.description || "Sin descripción adicional."}
                </p>
              </div>

              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Comentarios
                  </h3>
                  <span className="text-xs text-zinc-600">
                    {taskDetail.comments?.length ?? 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {taskDetail.comments?.length ? (
                    taskDetail.comments.map((comment) => (
                      <article
                        key={comment.id}
                        className="rounded border border-[#1e1f2e]/60 bg-[#151522]/55 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-200">
                            {memberName(comment.author)}
                          </span>
                          <time className="text-[11px] text-zinc-600">
                            {formatCollaborationTimestamp(comment.createdAt)}
                          </time>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                          {comment.content}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Aún no hay comentarios en esta tarea.
                    </p>
                  )}
                </div>

                <form
                  className="space-y-3 border-t border-[#1e1f2e]/50 pt-4"
                  onSubmit={handleCommentSubmit}
                >
                  <label className="block">
                    <span className="sr-only">Agregar comentario</span>
                    <textarea
                      value={commentContent}
                      onChange={(event) => setCommentContent(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      required
                      placeholder="Escribe una actualización o pregunta..."
                      className="w-full rounded bg-[#151522] border border-[#1e1f2e]/80 p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#4067c9]"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={commentSubmitting || !commentContent.trim()}
                      className="rounded bg-[#4067c9] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5278d5] disabled:opacity-50"
                    >
                      {commentSubmitting ? "Publicando..." : "Agregar comentario"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Dropdowns fields card exactly as Figma */}
              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-500 block mb-2 uppercase">
                      Proyecto
                    </span>
                    <select
                      disabled
                      className="h-10 w-full rounded bg-[#151522]/50 border border-[#1e1f2e]/60 px-3 text-xs text-zinc-400 cursor-not-allowed outline-none"
                    >
                      <option>{selectedProject?.name}</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-zinc-500 block mb-2 uppercase">
                      Fase
                    </span>
                    <select
                      disabled
                      className="h-10 w-full rounded bg-[#151522]/50 border border-[#1e1f2e]/60 px-3 text-xs text-zinc-400 cursor-not-allowed outline-none"
                    >
                      <option>
                        {taskDetail.phase?.name || "Implementación"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-zinc-500 block mb-2 uppercase">
                      Versión
                    </span>
                    <select
                      disabled
                      className="h-10 w-full rounded bg-[#151522]/50 border border-[#1e1f2e]/60 px-3 text-xs text-zinc-400 cursor-not-allowed outline-none"
                    >
                      <option>Versión 1</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Action widgets sidebar */}
            <div className="space-y-6">
              {/* Responsables list container card */}
              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Responsables
                </h3>
                <div className="space-y-3">
                  {detailAssignees.length > 0 ? (
                    detailAssignees.map((assignee, idx) => (
                      <div
                        key={assignee.id}
                        className="flex items-center justify-between gap-3 bg-[#161726]/50 border border-[#1e1f2e]/40 rounded p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-900/65 text-xs font-bold text-indigo-300 border border-indigo-500/20">
                            {assignee.firstNames[0]}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {memberName(assignee)}
                          </span>
                        </div>
                        {idx === 0 && (
                          <span className="rounded bg-indigo-950/65 text-[9px] font-bold text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5">
                            Responsable principal
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">Sin responsables asignados.</p>
                  )}
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="w-full text-center py-2.5 rounded bg-[#161726] border border-[#1e1f2e]/80 text-xs font-bold text-[#5278d5] hover:bg-[#1f2033] transition"
                  >
                    + Asignar responsables
                  </button>
                )}
              </div>

              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Historial de estado
                </h3>
                <ol className="space-y-4">
                  {taskDetail.statusHistory?.length ? (
                    taskDetail.statusHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="border-l border-[#4067c9]/40 pl-4"
                      >
                        <p className="text-xs leading-5 text-zinc-300">
                          <span className="font-semibold text-zinc-100">
                            {memberName(entry.actor)}
                          </span>{" "}
                          cambió de {STATUS_INFO[entry.previousStatus].label} a{" "}
                          {STATUS_INFO[entry.newStatus].label}.
                        </p>
                        <time className="mt-1 block text-[11px] text-zinc-600">
                          {formatCollaborationTimestamp(entry.createdAt)}
                        </time>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-zinc-500">
                      Aún no hay cambios de estado.
                    </li>
                  )}
                </ol>
              </div>

              {/* State pills transition switcher card */}
              <div className="rounded-md border border-[#1e1f2e] bg-[#0c0d16] p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Estado
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {(["todo", "in_progress", "in_review", "done"] as TaskStatus[]).map(
                    (st) => {
                      const isActive = taskDetail.status === st;
                      const isAllowed =
                        canChangeStatus &&
                        STATUS_TRANSITIONS[taskDetail.status]?.includes(st);

                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={isActive || !isAllowed}
                          onClick={() => handleTransition(st)}
                          className={`rounded px-3 py-1.5 text-xs font-semibold border transition ${
                            isActive
                              ? "bg-[#4067c9] text-white border-[#4067c9] cursor-default"
                              : isAllowed
                                ? "bg-[#161726] text-zinc-300 border-[#1e1f2e]/85 hover:bg-[#1f2033] hover:text-white"
                                : "bg-zinc-950/20 text-zinc-600 border-zinc-900/40 cursor-not-allowed opacity-45"
                          }`}
                        >
                          {STATUS_INFO[st].label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/10 p-12 text-center text-zinc-500">
          Selecciona una tarea para comenzar.
        </div>
      )}
    </div>
  );
}
