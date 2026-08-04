"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { filterAndSortMembers, type MemberDirectoryFilters } from "../people-management-utils";
import type { ManagedArea, ManagedMember, ManagedProject } from "../people-management.types";
import { fieldClass, memberName, displayCycle, StatusPill, PageHeading, SearchField } from "./shared";

const emptyFilters: MemberDirectoryFilters = {
  query: "",
  activity: "",
  availability: "",
  areaId: "",
  cycle: "",
  career: "",
  projectLabel: "",
};

import { MemberForm } from "./member-form";
export { MemberForm } from "./member-form";

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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
      <PageHeading title="Miembros" />
      <div className="relative mb-10 grid gap-3 lg:grid-cols-[minmax(320px,2.4fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(150px,1fr)_44px]">
        <div>
          <SearchField
            value={filters.query}
            placeholder="Buscar miembro..."
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
        <button
          type="button"
          className="grid h-11 place-items-center rounded-md bg-[#191822] text-xl text-white/55 hover:text-white"
          title="Más filtros"
          aria-label="Más filtros"
          onClick={() => setShowAdvancedFilters((current) => !current)}
        >
          ⋯
        </button>
        {showAdvancedFilters && (
          <div className="absolute top-14 right-0 z-20 grid w-full max-w-3xl gap-3 rounded-md border border-white/10 bg-[#191822] p-4 shadow-2xl sm:grid-cols-3">
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
        )}
      </div>
      <section className="min-h-[620px] rounded-md bg-[#191822] p-5 sm:p-6">
        <div className="sr-only">{filtered.length} miembros encontrados</div>
        <MemberTable members={filtered} onOpenMember={onOpenMember} />
      </section>
      {currentRole === "presidencia" && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-[#212330] px-4 py-2.5 text-sm text-white/80 hover:bg-[#2b2d3d]"
            onClick={() => setCreating(true)}
          >
            ＋ &nbsp; Añadir miembro
          </button>
        </div>
      )}
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

export function MemberTable({
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
            <th className="rounded-r-md px-4 py-3">Área</th>
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/unicore/member-avatar.png"
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onOpenMember(member.id)}
                      className="font-medium text-white hover:underline"
                    >
                      {memberName(member)}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {member.major}
                  <span className="ml-2 text-white/50">
                    · {displayCycle(member.cycle)}
                  </span>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
                  <StatusPill value={member.activityStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill value={member.availabilityStatus} />
                </td>
                <td className="px-4 py-3">
                  {membership?.area?.name ??
                    (membership?.areaId
                      ? `Área ${membership.areaId}`
                      : "Sin área")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
