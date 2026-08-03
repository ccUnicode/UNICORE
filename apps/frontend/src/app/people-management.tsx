"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { ApiError, authorizedJson } from "@/lib/auth-client";
import {
  filterAndSortMembers,
  getProjectLabelsForMember,
  type MemberDirectoryFilters,
} from "./people-management-utils";

export type ManagedArea = {
  id: number;
  name: string;
  description: string | null;
  isArchived?: boolean;
};

export type ManagedSkill = { id?: number; name: string };

export type ManagedAreaMembership = {
  id?: number;
  areaId: number | null;
  role?: string;
  area?: ManagedArea;
};

export type ManagedMember = {
  id: number;
  firstNames: string;
  lastNames: string;
  institution?: string;
  studentCode?: string | null;
  major: string;
  birthDate?: string | null;
  cycle?: number | null;
  role: string;
  areaId?: number | null;
  area?: ManagedArea | null;
  activityStatus?: string;
  availabilityStatus?: string;
  skills?: ManagedSkill[];
  memberships?: ManagedAreaMembership[];
};

export type ManagedProject = {
  id: number;
  name: string;
  description: string | null;
  areaId?: number;
  area?: ManagedArea | null;
  labels?: Array<{ id?: number; name: string }>;
  memberships?: Array<{ memberId: number; role?: string }>;
};

export type AreaMetric = {
  area: ManagedArea;
  memberCount: number;
  projectCount: number;
  members: ManagedMember[];
  projects: ManagedProject[];
};

const fieldClass =
  "h-11 w-full rounded-md border border-white/10 bg-[#171822] px-3 text-sm text-white outline-none focus:border-[#7478ff]";
const labelClass = "grid gap-2 text-sm font-semibold text-white/70";
const primaryButton =
  "rounded-md bg-[#7478ff] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#8589ff] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10";
const dangerButton =
  "rounded-md border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50";

function memberName(member: ManagedMember): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

function messageFrom(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "No se pudo completar la operación.";
}

function statusClass(status?: string): string {
  switch (status) {
    case "active":
    case "available":
      return "bg-lime-400/80 text-lime-950";
    case "inactive":
    case "disabled":
      return "bg-rose-300 text-rose-950";
    case "not_available":
      return "bg-amber-300 text-amber-950";
    default:
      return "bg-white/15 text-white/75";
  }
}

function StatusPill({ value }: { value?: string }) {
  return (
    <span
      className={`rounded px-2 py-1 text-[11px] font-bold ${statusClass(value)}`}
    >
      {value?.replaceAll("_", " ") ?? "N/D"}
    </span>
  );
}

function Feedback({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-lime-400/30 bg-lime-400/10 text-lime-100"
          : "border-rose-400/30 bg-rose-400/10 text-rose-100"
      }`}
    >
      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <section className="my-8 w-full max-w-3xl rounded-md border border-white/10 bg-[#20212c] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md bg-white/8 text-xl text-white/70 hover:bg-white/12"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-5xl font-black leading-tight sm:text-6xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-white/55">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function SearchField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
        ⌕
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md bg-[#f2f2f7] pl-9 pr-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#7478ff]"
      />
    </label>
  );
}

export function AreasManagementView({
  metrics,
  accessToken,
  currentRole,
  onSelectArea,
  onChanged,
}: {
  metrics: AreaMetric[];
  accessToken: string;
  currentRole: string;
  onSelectArea: (areaId: number) => void;
  onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<ManagedArea | "create" | null>(null);
  const [archiving, setArchiving] = useState<ManagedArea | null>(null);
  const canEdit = currentRole === "presidencia";
  const filtered = metrics.filter(({ area }) => {
    const matchesQuery = `${area.name} ${area.description ?? ""}`
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es"));
    const archived = Boolean(area.isArchived);
    return (
      matchesQuery &&
      (!status || (status === "archived" ? archived : !archived))
    );
  });

  return (
    <div>
      <PageHeading
        title="Áreas"
        subtitle="Gestiona las áreas operativas, sus integrantes y los proyectos vinculados."
        action={
          canEdit ? (
            <button
              type="button"
              className={primaryButton}
              onClick={() => setEditing("create")}
            >
              ＋ Añadir área
            </button>
          ) : undefined
        }
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row">
        <SearchField
          value={query}
          placeholder="Buscar áreas..."
          onChange={setQuery}
        />
        <select
          aria-label="Filtrar áreas por estado"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={`${fieldClass} lg:w-52`}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="archived">Archivadas</option>
        </select>
      </div>
      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((metric) => (
          <article
            key={metric.area.id}
            className="group rounded-md border border-white/8 bg-[#212330] p-5 transition hover:-translate-y-0.5 hover:border-white/20"
          >
            <button
              type="button"
              onClick={() => onSelectArea(metric.area.id)}
              className="w-full text-left"
            >
              <div className="mb-5 grid h-36 place-items-center rounded-md bg-[#d9d9d9] text-5xl font-black text-[#212330]">
                {metric.area.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill
                  value={metric.area.isArchived ? "archived" : "active"}
                />
                <span className="rounded bg-yellow-200 px-2 py-1 text-[11px] font-bold text-yellow-900">
                  {metric.memberCount} miembros
                </span>
                <span className="rounded bg-violet-200 px-2 py-1 text-[11px] font-bold text-violet-900">
                  {metric.projectCount} proyectos
                </span>
              </div>
              <h2 className="mt-4 text-xl font-black">{metric.area.name}</h2>
              <p className="mt-2 min-h-10 text-sm leading-5 text-white/55">
                {metric.area.description ?? "Área operativa de UNICORE."}
              </p>
            </button>
            {canEdit && !metric.area.isArchived && (
              <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-4">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setEditing(metric.area)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={dangerButton}
                  onClick={() => setArchiving(metric.area)}
                >
                  Archivar área
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-md border border-dashed border-white/15 px-6 py-14 text-center text-white/45">
          No hay áreas para estos filtros.
        </div>
      )}
      {editing && (
        <AreaForm
          area={editing === "create" ? undefined : editing}
          accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      )}
      {archiving && (
        <ExactNameAction
          title="Archivar área"
          name={archiving.name}
          description="El área dejará de estar disponible para nuevas operaciones, pero sus miembros, proyectos e historial se conservarán."
          actionLabel="Archivar área"
          accessToken={accessToken}
          path={`/areas/${archiving.id}/archive`}
          onClose={() => setArchiving(null)}
          onDone={async () => {
            setArchiving(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function AreaForm({
  area,
  accessToken,
  onClose,
  onSaved,
}: {
  area?: ManagedArea;
  accessToken: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(area?.name ?? "");
  const [description, setDescription] = useState(area?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(area ? `/areas/${area.id}` : "/areas", accessToken, {
        method: area ? "PATCH" : "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      await onSaved();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={area ? "Editar área" : "Añadir área"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <label className={labelClass}>
          Nombre
          <input
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className={`${fieldClass} h-auto py-3`}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving || !name.trim()} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar área"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ExactNameAction({
  title,
  name,
  description,
  actionLabel,
  accessToken,
  path,
  onClose,
  onDone,
}: {
  title: string;
  name: string;
  description: string;
  actionLabel: string;
  accessToken: string;
  path: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(path, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ confirmName: confirmation }),
      });
      await onDone();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <p className="text-sm leading-6 text-white/65">{description}</p>
        <label className={labelClass}>
          Escribe <strong className="text-white">{name}</strong> para confirmar
          <input
            autoFocus
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={dangerButton}
            disabled={saving || confirmation !== name}
          >
            {saving ? "Procesando..." : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AreaDetailManagementView({
  metric,
  accessToken,
  currentRole,
  onBack,
  onOpenMember,
  onGoToMembers,
  onChanged,
}: {
  metric: AreaMetric;
  accessToken: string;
  currentRole: string;
  onBack: () => void;
  onOpenMember: (memberId: number) => void;
  onGoToMembers: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const canEdit = currentRole === "presidencia";
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm text-white/65 hover:text-white"
      >
        ← Áreas / {metric.area.name}
      </button>
      <PageHeading
        title={metric.area.name}
        subtitle={metric.area.description ?? "Detalle del área y sus miembros."}
        action={
          canEdit ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setEditing(true)}
              >
                Editar
              </button>
              <button
                type="button"
                className={dangerButton}
                onClick={() => setArchiving(true)}
              >
                Archivar área
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="mb-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        <Metric label="Miembros" value={metric.memberCount} icon="●" />
        <Metric label="Proyectos" value={metric.projectCount} icon="▣" />
        <Metric
          label="Disponibles"
          value={
            metric.members.filter(
              (member) => member.availabilityStatus === "available",
            ).length
          }
          icon="◎"
        />
      </div>
      <section className="rounded-md border border-white/8 bg-[#191822] p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black">Miembros</h2>
          {canEdit && (
            <button
              type="button"
              className={primaryButton}
              onClick={onGoToMembers}
            >
              ＋ Añadir miembro
            </button>
          )}
        </div>
        <MemberTable
          members={metric.members}
          areaId={metric.area.id}
          onOpenMember={onOpenMember}
        />
      </section>
      {editing && (
        <AreaForm
          area={metric.area}
          accessToken={accessToken}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChanged();
          }}
        />
      )}
      {archiving && (
        <ExactNameAction
          title="Archivar área"
          name={metric.area.name}
          description="El área se archivará sin eliminar sus miembros, proyectos ni historial."
          actionLabel="Archivar área"
          accessToken={accessToken}
          path={`/areas/${metric.area.id}/archive`}
          onClose={() => setArchiving(false)}
          onDone={async () => {
            setArchiving(false);
            onBack();
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-[#20212c] p-5">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/8 text-xl">
        {icon}
      </span>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
    </div>
  );
}

const emptyFilters: MemberDirectoryFilters = {
  query: "",
  activity: "",
  availability: "",
  areaId: "",
  cycle: "",
  career: "",
  projectLabel: "",
};

export function MembersManagementView({
  members,
  areas,
  projects,
  accessToken,
  currentRole,
  onOpenMember,
  onChanged,
}: {
  members: ManagedMember[];
  areas: ManagedArea[];
  projects: ManagedProject[];
  accessToken: string;
  currentRole: string;
  onOpenMember: (memberId: number) => void;
  onChanged: () => Promise<void>;
}) {
  const [filters, setFilters] = useState(emptyFilters);
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(
    () => filterAndSortMembers(members, projects, filters),
    [members, projects, filters],
  );
  const cycles = [
    ...new Set(
      members
        .map((member) => member.cycle)
        .filter((cycle): cycle is number => typeof cycle === "number"),
    ),
  ].sort((a, b) => a - b);
  const careers = [...new Set(members.map((member) => member.major))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );
  const labels = [
    ...new Set(
      projects.flatMap(
        (project) => project.labels?.map((label) => label.name) ?? [],
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const setFilter = (key: keyof MemberDirectoryFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div>
      <PageHeading
        title="Miembros"
        subtitle="Consulta perfiles, disponibilidad, skills, ciclos y participación por área."
        action={
          currentRole === "presidencia" ? (
            <button
              type="button"
              className={primaryButton}
              onClick={() => setCreating(true)}
            >
              ＋ Añadir miembro
            </button>
          ) : undefined
        }
      />
      <div className="mb-7 grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <SearchField
            value={filters.query}
            placeholder="Buscar miembro, carrera o skill..."
            onChange={(value) => setFilter("query", value)}
          />
        </div>
        <FilterSelect
          label="Actividad"
          value={filters.activity}
          onChange={(value) => setFilter("activity", value)}
          options={[
            ["active", "Activo"],
            ["inactive", "Inactivo"],
          ]}
        />
        <FilterSelect
          label="Disponibilidad"
          value={filters.availability}
          onChange={(value) => setFilter("availability", value)}
          options={[
            ["available", "Disponible"],
            ["not_available", "No disponible"],
            ["disabled", "Inhabilitado"],
          ]}
        />
        <FilterSelect
          label="Área"
          value={filters.areaId}
          onChange={(value) => setFilter("areaId", value)}
          options={areas.map((area) => [String(area.id), area.name])}
        />
        <FilterSelect
          label="Ciclo"
          value={filters.cycle}
          onChange={(value) => setFilter("cycle", value)}
          options={cycles.map((cycle) => [String(cycle), `${cycle}°`])}
        />
        <FilterSelect
          label="Carrera"
          value={filters.career}
          onChange={(value) => setFilter("career", value)}
          options={careers.map((career) => [career, career])}
        />
        <FilterSelect
          label="Etiqueta de proyecto"
          value={filters.projectLabel}
          onChange={(value) => setFilter("projectLabel", value)}
          options={labels.map((label) => [label, label])}
        />
      </div>
      <section className="rounded-md border border-white/8 bg-[#191822] p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Resultados</h2>
          <span className="text-sm text-white/45">
            {filtered.length} miembros
          </span>
        </div>
        <MemberTable members={filtered} onOpenMember={onOpenMember} />
      </section>
      {creating && (
        <MemberForm
          areas={areas}
          accessToken={accessToken}
          onClose={() => setCreating(false)}
          onSaved={async (memberId) => {
            setCreating(false);
            await onChanged();
            onOpenMember(memberId);
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    >
      <option value="">{label}</option>
      {options.map(([valueOption, text]) => (
        <option key={valueOption} value={valueOption}>
          {text}
        </option>
      ))}
    </select>
  );
}

function MemberTable({
  members,
  areaId,
  onOpenMember,
}: {
  members: ManagedMember[];
  areaId?: number;
  onOpenMember: (memberId: number) => void;
}) {
  if (!members.length)
    return (
      <div className="rounded-md border border-dashed border-white/12 px-5 py-10 text-center text-sm text-white/45">
        No hay miembros para mostrar.
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="bg-[#212330] text-white/75">
            <th className="rounded-l-md px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Carrera/Ciclo</th>
            <th className="px-4 py-3">Skills</th>
            <th className="px-4 py-3">Actividad</th>
            <th className="px-4 py-3">Disponibilidad</th>
            <th className="rounded-r-md px-4 py-3">Área / Rol</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {members.map((member) => {
            const membership =
              areaId === undefined
                ? member.memberships?.find((item) => item.areaId !== null)
                : member.memberships?.find((item) => item.areaId === areaId);
            return (
              <tr
                key={member.id}
                className={
                  member.activityStatus === "inactive"
                    ? "text-white/40"
                    : "text-white/80"
                }
              >
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onOpenMember(member.id)}
                    className="font-bold text-white hover:underline"
                  >
                    {memberName(member)}
                  </button>
                  <p className="mt-1 text-xs text-white/40">
                    {member.studentCode ?? "Sin código"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {member.major}
                  <span className="ml-2 text-white/40">
                    {member.cycle ? `${member.cycle}°` : ""}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {member.skills?.slice(0, 3).map((skill) => (
                      <span
                        key={skill.id ?? skill.name}
                        className="rounded bg-[#6777bb] px-2 py-1 text-[10px] text-white"
                      >
                        {skill.name}
                      </span>
                    ))}
                    {(member.skills?.length ?? 0) > 3 && (
                      <span className="text-xs text-white/45">
                        +{(member.skills?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusPill value={member.activityStatus} />
                </td>
                <td className="px-4 py-4">
                  <StatusPill value={member.availabilityStatus} />
                </td>
                <td className="px-4 py-4">
                  {membership?.area?.name ??
                    (membership?.areaId
                      ? `Área ${membership.areaId}`
                      : "Sin área")}
                  <p className="mt-1 text-xs text-white/40">
                    {membership?.role ?? member.role}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type MemberFormState = {
  institution: string;
  studentCode: string;
  firstNames: string;
  lastNames: string;
  major: string;
  birthDate: string;
  role: string;
  areaId: string;
  skills: string;
  activityStatus: string;
  availabilityStatus: string;
  cycle: string;
};

function MemberForm({
  member,
  areas,
  accessToken,
  onClose,
  onSaved,
}: {
  member?: ManagedMember;
  areas: ManagedArea[];
  accessToken: string;
  onClose: () => void;
  onSaved: (memberId: number) => Promise<void>;
}) {
  const initial: MemberFormState = {
    institution: member?.institution ?? "UNI",
    studentCode: member?.studentCode ?? "",
    firstNames: member?.firstNames ?? "",
    lastNames: member?.lastNames ?? "",
    major: member?.major ?? "",
    birthDate: member?.birthDate?.slice(0, 10) ?? "",
    role: member?.role ?? "miembro",
    areaId: member?.areaId ? String(member.areaId) : "",
    skills: member?.skills?.map((skill) => skill.name).join(", ") ?? "",
    activityStatus: member?.activityStatus ?? "active",
    availabilityStatus: member?.availabilityStatus ?? "available",
    cycle: member?.cycle ? String(member.cycle) : "",
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof MemberFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const skills = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const payload = {
        institution: form.institution.trim(),
        studentCode: form.studentCode.trim() || undefined,
        firstNames: form.firstNames.trim(),
        lastNames: form.lastNames.trim(),
        major: form.major.trim(),
        birthDate: form.birthDate || undefined,
        skills,
        activityStatus: form.activityStatus,
        availabilityStatus: form.availabilityStatus,
        cycle: form.cycle ? Number(form.cycle) : undefined,
        ...(!member
          ? {
              role: form.role,
              ...(form.role === "directiva_de_area" && form.areaId
                ? { areaId: Number(form.areaId) }
                : {}),
            }
          : {}),
      };
      const saved = await authorizedJson<ManagedMember>(
        member ? `/members/${member.id}` : "/members",
        accessToken,
        { method: member ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      if (!member && form.role === "miembro" && form.areaId) {
        await authorizedJson("/area-memberships", accessToken, {
          method: "POST",
          body: JSON.stringify({
            memberId: saved.id,
            areaId: Number(form.areaId),
            role: "miembro",
          }),
        });
      }
      await onSaved(saved.id);
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={member ? "Editar miembro" : "Añadir miembro"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Nombres"
            required
            value={form.firstNames}
            onChange={(value) => set("firstNames", value)}
          />
          <FormInput
            label="Apellidos"
            required
            value={form.lastNames}
            onChange={(value) => set("lastNames", value)}
          />
          <FormInput
            label="Institución"
            required
            value={form.institution}
            onChange={(value) => set("institution", value)}
          />
          <FormInput
            label="Código de estudiante"
            required={form.institution.trim().toUpperCase() === "UNI"}
            value={form.studentCode}
            onChange={(value) => set("studentCode", value)}
          />
          <FormInput
            label="Carrera"
            required
            value={form.major}
            onChange={(value) => set("major", value)}
          />
          <FormInput
            label="Fecha de nacimiento"
            required={!member}
            type="date"
            value={form.birthDate}
            onChange={(value) => set("birthDate", value)}
          />
          {!member && (
            <>
              <label className={labelClass}>
                Rol
                <select
                  value={form.role}
                  onChange={(event) => set("role", event.target.value)}
                  className={fieldClass}
                >
                  <option value="miembro">Miembro</option>
                  <option value="directiva_de_area">Directiva de área</option>
                  <option value="presidencia">Presidencia</option>
                </select>
              </label>
              <label className={labelClass}>
                Área
                <select
                  value={form.areaId}
                  disabled={form.role === "presidencia"}
                  onChange={(event) => set("areaId", event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Sin área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <FormInput
            label="Ciclo"
            type="number"
            min="1"
            max="12"
            value={form.cycle}
            onChange={(value) => set("cycle", value)}
          />
          <label className={labelClass}>
            Actividad
            <select
              value={form.activityStatus}
              onChange={(event) => set("activityStatus", event.target.value)}
              className={fieldClass}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label className={labelClass}>
            Disponibilidad
            <select
              value={form.availabilityStatus}
              onChange={(event) =>
                set("availabilityStatus", event.target.value)
              }
              className={fieldClass}
            >
              <option value="available">Disponible</option>
              <option value="not_available">No disponible</option>
              <option value="disabled">Inhabilitado</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <FormInput
              label="Skills separadas por comas"
              required
              value={form.skills}
              onChange={(value) => set("skills", value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar miembro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FormInput({
  label,
  value,
  onChange,
  required,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

export function MemberProfileManagementView({
  member,
  areas,
  projects,
  accessToken,
  currentRole,
  onBack,
  onChanged,
}: {
  member: ManagedMember;
  areas: ManagedArea[];
  projects: ManagedProject[];
  accessToken: string;
  currentRole: string;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [membership, setMembership] = useState<
    ManagedAreaMembership | "create" | null
  >(null);
  const [error, setError] = useState("");
  const memberProjects = projects.filter((project) =>
    project.memberships?.some((item) => item.memberId === member.id),
  );
  const canEdit = currentRole === "presidencia";
  const canDeactivate =
    currentRole === "presidencia" || currentRole === "directiva_de_area";
  const removeMembership = async (item: ManagedAreaMembership) => {
    if (
      !item.id ||
      !window.confirm(
        "¿Quitar esta pertenencia de área? El perfil y su historial se conservarán.",
      )
    )
      return;
    setError("");
    try {
      await authorizedJson(`/area-memberships/${item.id}`, accessToken, {
        method: "DELETE",
      });
      await onChanged();
    } catch (currentError) {
      setError(messageFrom(currentError));
    }
  };
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm text-white/65 hover:text-white"
      >
        ← Miembros / {memberName(member)}
      </button>
      {error && (
        <div className="mb-6">
          <Feedback>{error}</Feedback>
        </div>
      )}
      <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="self-start rounded-md border border-white/8 bg-[#191822] p-7">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#d9d9d9] text-4xl font-black text-[#212330]">
            {member.firstNames[0]}
            {member.lastNames[0]}
          </div>
          <h1 className="mt-5 text-center text-2xl font-black">
            {memberName(member)}
          </h1>
          <p className="mt-1 text-center text-white/55">
            {member.major}
            {member.cycle ? ` · ${member.cycle}°` : ""}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <StatusPill value={member.activityStatus} />
            <StatusPill value={member.availabilityStatus} />
          </div>
          <div className="mt-7 space-y-3 border-t border-white/8 pt-5 text-sm">
            <ProfileRow
              label="Institución"
              value={member.institution ?? "UNI"}
            />
            <ProfileRow
              label="Código"
              value={member.studentCode ?? "Sin código"}
            />
            <ProfileRow label="Rol" value={member.role} />
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">
              Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {member.skills?.map((skill) => (
                <span
                  key={skill.id ?? skill.name}
                  className="rounded bg-[#6777bb] px-2 py-1 text-xs"
                >
                  {skill.name}
                </span>
              ))}
              {!member.skills?.length && (
                <span className="text-sm text-white/40">Sin skills</span>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              className={`${secondaryButton} mt-7 w-full`}
              onClick={() => setEditing(true)}
            >
              Editar perfil
            </button>
          )}
          {canDeactivate && member.activityStatus !== "inactive" && (
            <button
              type="button"
              className={`${dangerButton} mt-3 w-full`}
              onClick={() => setDeactivating(true)}
            >
              Desactivar miembro
            </button>
          )}
        </aside>
        <div className="grid gap-6">
          <section className="rounded-md border border-white/8 bg-[#191822] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Áreas y roles</h2>
              {canEdit && (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => setMembership("create")}
                >
                  ＋ Añadir
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="bg-[#212330] text-white/75">
                    <th className="rounded-l-md px-4 py-3">Área</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    {canEdit && (
                      <th className="rounded-r-md px-4 py-3 text-right">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {member.memberships
                    ?.filter((item) => item.areaId !== null)
                    .map((item) => (
                      <tr key={item.id ?? `${item.areaId}-${item.role}`}>
                        <td className="px-4 py-4">
                          {item.area?.name ?? `Área ${item.areaId}`}
                        </td>
                        <td className="px-4 py-4">{item.role ?? "miembro"}</td>
                        <td className="px-4 py-4">
                          <StatusPill value={member.activityStatus} />
                        </td>
                        {canEdit && (
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              className="mr-3 text-indigo-200 hover:underline"
                              onClick={() => setMembership(item)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-rose-200 hover:underline"
                              onClick={() => void removeMembership(item)}
                            >
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
              {!member.memberships?.some((item) => item.areaId !== null) && (
                <p className="px-4 py-8 text-center text-sm text-white/40">
                  Sin pertenencias de área.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-md border border-white/8 bg-[#191822] p-6">
            <h2 className="mb-5 text-xl font-black">Proyectos</h2>
            <div className="space-y-3">
              {memberProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-md bg-[#212330] px-4 py-3"
                >
                  <div>
                    <p className="font-bold">{project.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {project.area?.name ?? "Sin área"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {getProjectLabelsForMember(member.id, [project]).map(
                      (label) => (
                        <span
                          key={label}
                          className="rounded bg-white/8 px-2 py-1 text-xs text-white/65"
                        >
                          {label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ))}
              {!memberProjects.length && (
                <p className="text-sm text-white/40">
                  No hay proyectos asociados.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      {editing && (
        <MemberForm
          member={member}
          areas={areas}
          accessToken={accessToken}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChanged();
          }}
        />
      )}
      {deactivating && (
        <ExactNameAction
          title="Desactivar miembro"
          name={memberName(member)}
          description="El miembro quedará inactivo y no podrá seleccionarse en nuevos equipos. Sus áreas, proyectos y todo su historial se conservarán."
          actionLabel="Desactivar miembro"
          accessToken={accessToken}
          path={`/members/${member.id}/deactivate`}
          onClose={() => setDeactivating(false)}
          onDone={async () => {
            setDeactivating(false);
            await onChanged();
          }}
        />
      )}
      {membership && (
        <MembershipForm
          membership={membership === "create" ? undefined : membership}
          memberId={member.id}
          areas={areas}
          accessToken={accessToken}
          onClose={() => setMembership(null)}
          onSaved={async () => {
            setMembership(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className="text-right font-semibold text-white/80">{value}</span>
    </div>
  );
}

function MembershipForm({
  membership,
  memberId,
  areas,
  accessToken,
  onClose,
  onSaved,
}: {
  membership?: ManagedAreaMembership;
  memberId: number;
  areas: ManagedArea[];
  accessToken: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [areaId, setAreaId] = useState(
    membership?.areaId ? String(membership.areaId) : "",
  );
  const [role, setRole] = useState(membership?.role ?? "miembro");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(
        membership?.id
          ? `/area-memberships/${membership.id}`
          : "/area-memberships",
        accessToken,
        {
          method: membership?.id ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(!membership?.id ? { memberId } : {}),
            areaId: Number(areaId),
            role,
          }),
        },
      );
      await onSaved();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={membership ? "Editar área y rol" : "Añadir área y rol"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <label className={labelClass}>
          Área
          <select
            required
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Selecciona un área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Rol en el área
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={fieldClass}
          >
            <option value="miembro">Miembro</option>
            <option value="directiva_de_area">Directiva de área</option>
          </select>
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving || !areaId} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
