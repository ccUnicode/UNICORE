"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/auth-client";

export type AuditEvent = {
  id: number;
  actorId: number;
  actorName: string;
  actorRole: string;
  action: string;
  entityType?: string;
  targetType?: string;
  entityId?: string;
  targetId?: string;
  areaId: number | null;
  metadata: string | Record<string, unknown> | null;
  ipAddress?: string | null;
  timestamp?: string;
  createdAt?: string;
};

export type AuditResponse = {
  data: AuditEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
};

type AuditManagementProps = {
  accessToken: string;
};

const ACTION_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  create: { label: "Creación", bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300" },
  update: { label: "Edición", bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300" },
  archive: { label: "Archivado", bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300" },
  deactivate: { label: "Desactivación", bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300" },
  team_assignment: { label: "Equipo", bg: "bg-indigo-100 dark:bg-indigo-950/60", text: "text-indigo-700 dark:text-indigo-300" },
  task_status_transition: { label: "Estado Tarea", bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-700 dark:text-blue-300" },
  task_assignment: { label: "Asignación Tarea", bg: "bg-violet-100 dark:bg-violet-950/60", text: "text-violet-700 dark:text-violet-300" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  area: "Área",
  member: "Miembro",
  project: "Proyecto",
  task: "Tarea",
};

export default function AuditManagementView({ accessToken }: AuditManagementProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let ignore = false;
    async function loadAuditEvents() {
      setLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", page.toString());
        queryParams.set("limit", "10");
        if (entityTypeFilter) queryParams.set("entityType", entityTypeFilter);
        if (actionFilter) queryParams.set("action", actionFilter);
        if (dateFromFilter) queryParams.set("dateFrom", dateFromFilter);
        if (dateToFilter) queryParams.set("dateTo", dateToFilter);

        const response = await getJson<AuditResponse>(`/audit?${queryParams.toString()}`, accessToken);
        if (!ignore) {
          setEvents(response.data);
          setMeta(response.meta);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error al cargar eventos de auditoría");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAuditEvents();
    return () => {
      ignore = true;
    };
  }, [accessToken, page, entityTypeFilter, actionFilter, dateFromFilter, dateToFilter]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const parseMetadata = (rawMetadata: string | Record<string, unknown> | null): Record<string, unknown> | null => {
    if (!rawMetadata) return null;
    if (typeof rawMetadata === "object") return rawMetadata as Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawMetadata);
      if (typeof parsed === "string") {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch {
      return { raw: rawMetadata };
    }
  };

  const renderActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || {
      label: action,
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-300",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Bitácora de Auditoría
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historial inmutable y trazabilidad de acciones clave realizadas en la plataforma (V1).
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Entidad Afectada</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Todas las entidades</option>
              <option value="area">Área</option>
              <option value="member">Miembro</option>
              <option value="project">Proyecto</option>
              <option value="task">Tarea</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo de Acción</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Todas las acciones</option>
              <option value="create">Creación</option>
              <option value="update">Edición</option>
              <option value="archive">Archivado</option>
              <option value="deactivate">Desactivación</option>
              <option value="team_assignment">Equipo de Proyecto</option>
              <option value="task_status_transition">Cambio Estado Tarea</option>
              <option value="task_assignment">Asignación Tarea</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => {
                setDateFromFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hasta</label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => {
                setDateToFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total: {meta.total} registro{meta.total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table & Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <svg className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando registros de auditoría...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No se encontraron eventos de auditoría con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Acción</th>
                  <th className="px-6 py-3.5">Entidad</th>
                  <th className="px-6 py-3.5 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {events.map((ev) => {
                  const entityType = ev.entityType ?? ev.targetType ?? "desconocido";
                  const entityId = ev.entityId ?? ev.targetId ?? "";
                  const timestampStr = ev.timestamp ?? ev.createdAt;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {formatDate(timestampStr)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{ev.actorName || `ID ${ev.actorId}`}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">{ev.actorRole}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderActionBadge(ev.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        <span className="capitalize">{ENTITY_TYPE_LABELS[entityType] || entityType}</span> #{entityId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Ver metadata
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && events.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Página <span className="font-semibold text-slate-800 dark:text-slate-200">{meta.page}</span> de{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{meta.lastPage}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= meta.lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Detalles del Evento #{selectedEvent.id}</span>
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div><strong className="text-slate-900 dark:text-white">Actor:</strong> {selectedEvent.actorName} ({selectedEvent.actorRole})</div>
              <div><strong className="text-slate-900 dark:text-white">Acción:</strong> {selectedEvent.action}</div>
              <div>
                <strong className="text-slate-900 dark:text-white">Entidad Target:</strong>{" "}
                {ENTITY_TYPE_LABELS[selectedEvent.entityType ?? selectedEvent.targetType ?? ""] || (selectedEvent.entityType ?? selectedEvent.targetType)} #{selectedEvent.entityId ?? selectedEvent.targetId}
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white">Fecha UTC:</strong> {formatDate(selectedEvent.timestamp ?? selectedEvent.createdAt)}
              </div>
              {selectedEvent.ipAddress && <div><strong className="text-slate-900 dark:text-white">IP:</strong> {selectedEvent.ipAddress}</div>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Metadata (JSON):</label>
              <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto font-mono max-h-60">
                {(() => {
                  const parsed = parseMetadata(selectedEvent.metadata);
                  return parsed ? JSON.stringify(parsed, null, 2) : "Sin metadata";
                })()}
              </pre>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
