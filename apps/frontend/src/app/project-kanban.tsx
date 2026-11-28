"use client";

import { DragEvent, useEffect, useState } from "react";
import type { Member, Project, ProjectPhase } from "./project-management";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskAssignee = {
  id: number;
  taskId: number;
  memberId: number;
  member?: {
    id: number;
    firstNames: string;
    lastNames: string;
    avatarUrl?: string | null;
  } | null;
};

export type KanbanTask = {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  projectId: number;
  phaseId: number | null;
  phase?: ProjectPhase | null;
  assignees?: TaskAssignee[];
};

export const KANBAN_COLUMNS: {
  id: TaskStatus;
  title: string;
  color: string;
  border: string;
  badge: string;
}[] = [
  {
    id: "todo",
    title: "Por hacer",
    color: "text-zinc-300",
    border: "border-zinc-700/60",
    badge: "bg-zinc-800 text-zinc-300",
  },
  {
    id: "in_progress",
    title: "En progreso",
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    badge: "bg-indigo-500/10 text-indigo-400",
  },
  {
    id: "in_review",
    title: "En revisión",
    color: "text-amber-400",
    border: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-400",
  },
  {
    id: "done",
    title: "Hecho",
    color: "text-lime-400",
    border: "border-lime-500/30",
    badge: "bg-lime-500/10 text-lime-400",
  },
];

export const KANBAN_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["todo", "in_review"],
  in_review: ["in_progress", "done"],
  done: ["in_review"],
};

export function getMemberAreaIds(member?: Member | null): number[] {
  if (!member) return [];
  const ids = new Set<number>();
  if (typeof member.areaId === "number") ids.add(member.areaId);
  if (Array.isArray(member.memberships)) {
    for (const m of member.memberships) {
      if (typeof m.areaId === "number") ids.add(m.areaId);
    }
  }
  return Array.from(ids);
}

export function canMemberMoveTask(
  task: KanbanTask,
  project: Project,
  currentMember?: Member | null,
): boolean {
  if (!currentMember) return false;
  if (project.isArchived) return false;

  const role = currentMember.role?.trim().toLowerCase();
  if (role === "presidencia") return true;

  if (role === "directiva_de_area") {
    const userAreaIds = getMemberAreaIds(currentMember);
    const projectAreaId = project.areaId ?? project.area?.id;
    if (projectAreaId !== undefined && userAreaIds.includes(projectAreaId)) {
      return true;
    }
  }

  const membership = project.memberships?.find(
    (m) => m.memberId === currentMember.id,
  );
  if (
    membership &&
    (membership.role === "representative" ||
      membership.role === "subrepresentative")
  ) {
    return true;
  }

  // Regular member in project: only can move tasks where they are an assignee
  if (membership) {
    const isAssignee = task.assignees?.some(
      (a) =>
        a.memberId === currentMember.id || a.member?.id === currentMember.id,
    );
    return !!isAssignee;
  }

  return false;
}

export type ProjectKanbanProps = {
  project: Project;
  currentMember?: Member | null;
  apiUrl: string;
  accessToken: string;
  onRefresh: (message: string) => Promise<void>;
  onError?: (message: string) => void;
  initialTasks?: KanbanTask[];
};

export function ProjectKanbanBoard({
  project,
  currentMember,
  apiUrl,
  accessToken,
  onRefresh,
  onError,
  initialTasks,
}: ProjectKanbanProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks ?? []);
  const [loading, setLoading] = useState<boolean>(!initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks);
      return;
    }

    let isMounted = true;
    async function loadTasks() {
      setLoading(true);
      try {
        const response = await fetch(
          `${apiUrl}/tasks?projectId=${project.id}&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status} al cargar tareas.`);
        }

        const payload = (await response.json()) as
          | { data: KanbanTask[] }
          | KanbanTask[];
        const taskList = Array.isArray(payload) ? payload : (payload.data ?? []);

        if (isMounted) {
          setTasks(taskList);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las tareas.";
          setErrorMessage(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadTasks();
    return () => {
      isMounted = false;
    };
  }, [project.id, apiUrl, accessToken, initialTasks, onError]);

  async function handleMoveTask(taskId: number, targetStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;

    if (!canMemberMoveTask(task, project, currentMember)) {
      const msg =
        "No tienes permiso para mover tareas asignadas a otros miembros.";
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    const allowedTransitions = KANBAN_TRANSITIONS[task.status] ?? [];
    if (!allowedTransitions.includes(targetStatus)) {
      const colFrom =
        KANBAN_COLUMNS.find((c) => c.id === task.status)?.title ?? task.status;
      const colTo =
        KANBAN_COLUMNS.find((c) => c.id === targetStatus)?.title ?? targetStatus;
      const msg = `No se puede mover directamente de «${colFrom}» a «${colTo}».`;
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)),
    );
    setErrorMessage("");
    setIsUpdating(true);

    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response.ok) {
        let msg = `Error ${response.status}`;
        try {
          const body = (await response.json()) as {
            message?: string | string[];
          };
          msg = Array.isArray(body.message)
            ? body.message.join(", ")
            : (body.message ?? msg);
        } catch {
          // Fallback to response status
        }
        throw new Error(msg);
      }

      await onRefresh("Estado de tarea actualizado.");
    } catch (err: unknown) {
      setTasks(previousTasks);
      const errorText =
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar el estado de la tarea.";
      setErrorMessage(errorText);
      onError?.(errorText);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="mt-8" data-testid="project-kanban-board">
      {errorMessage && (
        <div
          data-testid="kanban-error-banner"
          className="mb-6 flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-200"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="ml-4 rounded px-2 py-1 font-bold text-rose-300 hover:bg-rose-500/20"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-white/50">
          Cargando tablero...
        </div>
      ) : (
        <div
          data-testid="kanban-scroll-container"
          className="overflow-x-auto pb-6"
        >
          <div className="grid min-w-[960px] grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((column) => {
              const columnTasks = tasks.filter((t) => t.status === column.id);

              return (
                <div
                  key={column.id}
                  data-testid={`kanban-column-${column.id}`}
                  onDragOver={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                  }}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    const taskIdStr = e.dataTransfer.getData("text/plain");
                    const taskId = Number(taskIdStr);
                    if (taskId) {
                      void handleMoveTask(taskId, column.id);
                    }
                  }}
                  className={`flex min-h-[500px] flex-col rounded-xl border ${column.border} bg-[#181920] p-4`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${column.color}`}>
                        {column.title}
                      </span>
                      <span
                        data-testid={`kanban-count-${column.id}`}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.badge}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-1 flex-col gap-3">
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/5 p-4 text-center text-xs text-white/30">
                        Sin tareas
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const canMove = canMemberMoveTask(
                          task,
                          project,
                          currentMember,
                        );
                        const phaseName =
                          project.phases?.find((p) => p.id === task.phaseId)
                            ?.name ?? "Sin fase";
                        const allowedNext =
                          KANBAN_TRANSITIONS[task.status] ?? [];

                        return (
                          <div
                            key={task.id}
                            data-testid={`kanban-card-${task.id}`}
                            draggable={canMove && !isUpdating}
                            onDragStart={(e: DragEvent<HTMLDivElement>) => {
                              if (!canMove || isUpdating) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.setData(
                                "text/plain",
                                String(task.id),
                              );
                              setDraggedTaskId(task.id);
                            }}
                            onDragEnd={() => setDraggedTaskId(null)}
                            className={`rounded-lg border bg-[#20212c] p-4 shadow-sm transition-all ${
                              canMove
                                ? "cursor-grab border-white/10 hover:border-white/20 active:cursor-grabbing"
                                : "cursor-default border-white/5 opacity-85"
                            } ${
                              draggedTaskId === task.id ? "opacity-30" : ""
                            }`}
                          >
                            <h4
                              data-testid={`kanban-task-title-${task.id}`}
                              className="text-sm font-bold leading-snug text-white"
                            >
                              {task.title}
                            </h4>

                            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                              <span className="text-white/40">Fase:</span>
                              <span
                                data-testid={`kanban-task-phase-${task.id}`}
                                className="rounded bg-white/5 px-2 py-0.5 font-medium text-white/80"
                              >
                                {phaseName}
                              </span>
                            </div>

                            <div className="mt-3 border-t border-white/5 pt-3">
                              <div
                                data-testid={`kanban-task-assignees-${task.id}`}
                                className="flex flex-wrap items-center gap-1.5"
                              >
                                {task.assignees && task.assignees.length > 0 ? (
                                  task.assignees.map((assignee) => {
                                    const fullName = assignee.member
                                      ? `${assignee.member.firstNames} ${assignee.member.lastNames}`.trim()
                                      : `Miembro #${assignee.memberId}`;
                                    return (
                                      <span
                                        key={assignee.id ?? assignee.memberId}
                                        title={fullName}
                                        className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-200"
                                      >
                                        {fullName}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs italic text-white/30">
                                    Sin asignar
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-2.5">
                              {canMove ? (
                                allowedNext.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {allowedNext.map((target) => {
                                      const targetCol = KANBAN_COLUMNS.find(
                                        (c) => c.id === target,
                                      );
                                      return (
                                        <button
                                          key={target}
                                          type="button"
                                          disabled={isUpdating}
                                          data-testid={`kanban-move-btn-${task.id}-${target}`}
                                          onClick={() =>
                                            void handleMoveTask(
                                              task.id,
                                              target,
                                            )
                                          }
                                          className="rounded bg-white/8 px-2 py-1 text-xs font-semibold text-white/80 hover:bg-[#7478ff] hover:text-white disabled:opacity-50"
                                          title={`Mover a ${targetCol?.title ?? target}`}
                                        >
                                          → {targetCol?.title ?? target}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null
                              ) : (
                                <span
                                  data-testid={`kanban-move-disabled-${task.id}`}
                                  className="text-[11px] font-medium text-white/30"
                                >
                                  Sin permisos de movimiento
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
