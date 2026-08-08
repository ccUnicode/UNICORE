"use client";

import Image from "next/image";
import { useState } from "react";
import type { AreaMetric, ManagedArea } from "../people-management.types";
import { fieldClass, primaryButton, secondaryButton, dangerButton, StatusPill, PageHeading, SearchField } from "./shared";
import { MemberTable } from "./members";

import { AreaForm, ExactNameAction } from "./area-actions";
export { ExactNameAction } from "./area-actions";

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
  const [openMenuAreaId, setOpenMenuAreaId] = useState<number | null>(null);
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
      <PageHeading title="Áreas" />
      <div className="mb-14 flex max-w-[950px] flex-col gap-3 lg:flex-row">
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(310px,400px))] gap-x-14 gap-y-16">
        {filtered.map((metric) => {
          const leaders = metric.members
            .filter((member) =>
              member.memberships?.some(
                (item) =>
                  item.areaId === metric.area.id &&
                  item.role === "directiva_de_area",
              ),
            )
            .concat(metric.members)
            .filter(
              (member, index, all) =>
                all.findIndex((candidate) => candidate.id === member.id) ===
                index,
            )
            .slice(0, 2);
          return (
            <article
              key={metric.area.id}
              className="group relative flex min-h-[574px] flex-col rounded-md bg-[#212330] p-5 transition hover:-translate-y-0.5"
            >
              <button
                type="button"
                onClick={() => onSelectArea(metric.area.id)}
                className="text-left"
              >
                <div className="mb-4 h-[244px] w-full rounded-md bg-[#d9d9d9]" />
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    value={metric.area.isArchived ? "archived" : "active"}
                  />
                  <span className="rounded bg-yellow-200 px-2 py-1 text-[11px] font-medium text-yellow-900">
                    {metric.memberCount} miembros
                  </span>
                  <span className="rounded bg-violet-200 px-2 py-1 text-[11px] font-medium text-violet-900">
                    ▣ {metric.projectCount} proyectos
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  {metric.area.name}
                </h2>
                <p className="mt-2 min-h-12 text-sm leading-5 text-white/70">
                  {metric.area.description ?? "Área operativa de UNICORE."}
                </p>
              </button>
              <div className="mt-auto flex min-h-16 items-end gap-8 pt-5 pr-10">
                {(leaders.length ? leaders : metric.members.slice(0, 2)).map(
                  (leader, index) => (
                    <div
                      key={leader.id}
                      className="flex items-center gap-3 text-xs text-white/80"
                    >
                      <Image
                        src="/unicore/member-avatar.png"
                        alt=""
                        width={50}
                        height={50}
                        className="h-[50px] w-[50px] rounded-full object-cover"
                      />
                      <span>{index === 0 ? "Director" : "Subdirector"}</span>
                    </div>
                  ),
                )}
                {!leaders.length && !metric.members.length && (
                  <span className="text-xs text-white/35">
                    Sin responsables
                  </span>
                )}
              </div>
              {canEdit && !metric.area.isArchived && (
                <div className="absolute right-5 bottom-5">
                  <button
                    type="button"
                    className="px-2 text-2xl leading-none text-white/40 hover:text-white"
                    aria-label={`Acciones de ${metric.area.name}`}
                    onClick={() =>
                      setOpenMenuAreaId((current) =>
                        current === metric.area.id ? null : metric.area.id,
                      )
                    }
                  >
                    ···
                  </button>
                  {openMenuAreaId === metric.area.id && (
                    <div className="absolute right-0 bottom-8 z-10 grid w-40 rounded-md border border-white/10 bg-[#191822] p-1 text-sm shadow-2xl">
                      <button
                        type="button"
                        className="rounded px-3 py-2 text-left hover:bg-white/10"
                        onClick={() => {
                          setEditing(metric.area);
                          setOpenMenuAreaId(null);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded px-3 py-2 text-left text-rose-200 hover:bg-white/10"
                        onClick={() => {
                          setArchiving(metric.area);
                          setOpenMenuAreaId(null);
                        }}
                      >
                        Archivar área
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("create")}
            className="grid min-h-[574px] place-content-center gap-4 text-center text-sm text-white/85"
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#212330] text-4xl font-light">
              +
            </span>
            <span>Añadir área</span>
          </button>
        )}
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
