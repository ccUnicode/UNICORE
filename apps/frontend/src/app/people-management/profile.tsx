"use client";

import Image from "next/image";
import { useState } from "react";
import { authorizedJson } from "@/lib/auth-client";
import type { ManagedArea, ManagedAreaMembership, ManagedMember, ManagedProject } from "../people-management.types";
import { dangerButton, memberName, displayCycle, messageFrom, displayRole, StatusPill, Feedback } from "./shared";
import { ExactNameAction } from "./areas";
import { MemberForm } from "./members";

import { MembershipForm } from "./membership-form";

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
      <div className="grid gap-16 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[439px_minmax(0,1fr)]">
        <aside className="self-start rounded-md bg-[#191822] px-12 py-14">
          <Image
            src="/unicore/member-avatar.png"
            alt={`Foto de ${memberName(member)}`}
            width={176}
            height={176}
            className="mx-auto h-44 w-44 rounded-full object-cover"
            priority
          />
          <h1 className="mt-7 text-center text-xl font-semibold">
            {memberName(member)}
          </h1>
          <p className="mt-1 text-center text-white/75">
            {member.major} · {displayCycle(member.cycle)}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <StatusPill value={member.activityStatus} />
            <StatusPill value={member.availabilityStatus} />
          </div>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            <ProfileRow
              label="Institución"
              value={member.institution ?? "UNI"}
            />
            <ProfileRow
              label="Código"
              value={member.studentCode ?? "Sin código"}
            />
            <ProfileRow label="Rol" value={displayRole(member.role)} />
          </div>
          <div className="mt-6">
            <p className="mb-3 text-xs text-white/55">Skills</p>
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
              className="mt-7 w-full text-center text-xs text-white/45 hover:text-white"
              onClick={() => setEditing(true)}
            >
              Editar perfil
            </button>
          )}
          {canDeactivate && member.activityStatus !== "inactive" && (
            <button
              type="button"
              className={`${dangerButton} mt-4 w-full bg-transparent py-3`}
              onClick={() => setDeactivating(true)}
            >
              Desactivar miembro
            </button>
          )}
        </aside>
        <div className="grid gap-11">
          <section className="rounded-md bg-[#191822] p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Áreas y roles</h2>
              {canEdit && (
                <button
                  type="button"
                  className="text-sm text-white/55 hover:text-white"
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
                        <td className="px-4 py-4">{displayRole(item.role)}</td>
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
          <section className="rounded-md bg-[#191822] p-6 lg:p-8">
            <h2 className="mb-5 text-xl font-semibold">Proyectos</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="bg-[#212330] text-white/85">
                    <th className="rounded-l-md px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="rounded-r-md px-4 py-3">Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {memberProjects.map((project) => {
                    const projectMembership = project.memberships?.find(
                      (item) => item.memberId === member.id,
                    );
                    return (
                      <tr key={project.id}>
                        <td className="px-4 py-4">{project.name}</td>
                        <td className="px-4 py-4">
                          {displayRole(projectMembership?.role)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill
                            value={
                              project.isArchived
                                ? "archived"
                                : (project.status ?? "active")
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-white/45">
                            Sin datos
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!memberProjects.length && (
                <p className="px-4 py-8 text-center text-sm text-white/40">
                  No hay proyectos asociados.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-md bg-[#191822] p-6 lg:p-8">
            <h2 className="text-xl font-semibold">Participación</h2>
            <div className="mt-6 rounded-md border border-dashed border-white/15 px-6 py-14 text-center">
              <p className="text-sm font-medium text-white/65">
                Aún no hay datos de participación disponibles.
              </p>
              <p className="mt-2 text-xs text-white/40">
                Esta sección se completará cuando exista una fuente de métricas.
              </p>
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
