"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "../components/brand-logo";
import { BRAND_LOGO_WIDTHS } from "../components/brand-logo.config";
import { fullName } from "./dashboard.model";
import type { Member, Project } from "./dashboard.types";
import {
  displayCycle,
  displayRole,
  StatusPill,
} from "../people-management/shared";
import {
  canViewInternalMemberProfileFields,
  formatProfileDate,
} from "../member-profile-client";

const chartDays = [
  { day: "Lun", done: 46, planned: 72 },
  { day: "Mar", done: 70, planned: 92 },
  { day: "Mie", done: 42, planned: 68 },
  { day: "Jue", done: 64, planned: 88 },
  { day: "Vie", done: 52, planned: 74 },
  { day: "Sáb", done: 36, planned: 58 },
  { day: "Dom", done: 44, planned: 62 },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <BrandLogo
      width={
        compact
          ? BRAND_LOGO_WIDTHS.compactSidebar
          : BRAND_LOGO_WIDTHS.sidebar
      }
      priority
      compact={compact}
    />
  );
}

export function SessionLoadingView() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#060610] text-white">
      <p className="text-sm text-white/60">Validando sesión…</p>
    </main>
  );
}

export function NavButton({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
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
    </Link>
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

export function DashboardView({
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
        subtitle="Resumen operativo de áreas, miembros y proyectos de UNICORE."
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
        <Panel title="Tu acceso">
          <StackList
            items={[
              {
                title: "Modo de acceso",
                subtitle: authRole.replaceAll("_", " "),
                meta: "Activo",
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
                meta: "Actualizados",
              },
              {
                title: "Resumen semanal",
                subtitle: "Vista general de actividad",
                meta: "Disponible",
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
  children: ReactNode;
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

export function PlaceholderView({ title }: { title: string }) {
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

export function RouteStateView({
  title,
  description,
  href = "/dashboard",
  action = "Volver al dashboard",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div>
      <SectionTitle title={title} subtitle={description} />
      <Link
        href={href}
        className="inline-flex rounded-md bg-[#4067c9] px-4 py-2.5 text-sm font-semibold hover:bg-[#5278d5]"
      >
        {action}
      </Link>
    </div>
  );
}

export function ProfileView({
  member,
  projects = [],
  onLogout,
}: {
  member: Member;
  projects?: Project[];
  onLogout: () => void;
}) {
  const canViewInternal = canViewInternalMemberProfileFields(member.role);
  const memberProjects = projects.filter((project) =>
    project.memberships?.some((item) => item.memberId === member.id),
  );

  const memberships =
    member.memberships && member.memberships.length > 0
      ? member.memberships
      : member.areaId || member.area
      ? [
          {
            id: 0,
            areaId: member.areaId ?? null,
            area: member.area ?? undefined,
            role: member.role,
          },
        ]
      : [];

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Mi perfil"
        subtitle="Consulta tus datos de membresía, áreas y proyectos asignados."
      />

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="self-start rounded-md border border-white/8 bg-[#191822] p-6 text-center lg:p-8">
          <Image
            src="/unicore/member-avatar.png"
            alt={`Foto de ${fullName(member)}`}
            width={140}
            height={140}
            className="mx-auto h-32 w-32 rounded-full border-2 border-white/10 object-cover"
            priority
          />
          <h1 className="mt-5 text-xl font-bold">{fullName(member)}</h1>
          <p className="mt-1 text-sm text-white/70">
            {member.major}
            {member.cycle ? ` · ${displayCycle(member.cycle)}` : ""}
          </p>

          {canViewInternal && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {member.activityStatus && (
                <StatusPill value={member.activityStatus} />
              )}
              {member.availabilityStatus && (
                <StatusPill value={member.availabilityStatus} />
              )}
            </div>
          )}

          <div className="mt-6 w-full space-y-3 border-t border-white/10 pt-5 text-left text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/45">Rol principal</span>
              <span className="font-semibold text-white/90">
                {displayRole(member.role)}
              </span>
            </div>

            {canViewInternal && member.studentCode && (
              <div className="flex items-center justify-between">
                <span className="text-white/45">Código UNI</span>
                <span className="font-semibold text-white/90">
                  {member.studentCode}
                </span>
              </div>
            )}

            {canViewInternal && member.institution && (
              <div className="flex items-center justify-between">
                <span className="text-white/45">Institución</span>
                <span className="font-semibold text-white/90">
                  {member.institution}
                </span>
              </div>
            )}
          </div>

          {canViewInternal && member.skills && member.skills.length > 0 && (
            <div className="mt-6 w-full border-t border-white/10 pt-5 text-left">
              <p className="mb-2 text-xs font-semibold text-white/55">
                Competencias
              </p>
              <div className="flex flex-wrap gap-1.5">
                {member.skills.map((skill) => (
                  <span
                    key={skill.id ?? skill.name}
                    className="rounded bg-[#6777bb]/60 px-2 py-0.5 text-xs text-white"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="mt-8 w-full rounded-md bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/12 hover:text-white"
          >
            Cerrar sesión
          </button>
        </aside>

        <div className="grid gap-8">
          <section className="rounded-md border border-white/8 bg-[#191822] p-6 lg:p-8">
            <h2 className="mb-4 text-lg font-bold">Áreas y roles</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="bg-[#212330] text-white/75">
                    <th className="rounded-l-md px-4 py-3">Área</th>
                    <th className="rounded-r-md px-4 py-3">Rol en el área</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {memberships.map((item) => (
                    <tr key={item.id ?? `${item.areaId}-${item.role}`}>
                      <td className="px-4 py-3.5 font-medium">
                        {item.area?.name ??
                          (item.areaId ? `Área ${item.areaId}` : "Todas las áreas")}
                      </td>
                      <td className="px-4 py-3.5 text-white/80">
                        {displayRole(item.role)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {memberships.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-white/40">
                  Sin pertenencias de área registradas.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-white/8 bg-[#191822] p-6 lg:p-8">
            <h2 className="mb-4 text-lg font-bold">Proyectos en los que participo</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="bg-[#212330] text-white/75">
                    <th className="rounded-l-md px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="rounded-r-md px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {memberProjects.map((project) => {
                    const projectMembership = project.memberships?.find(
                      (item) => item.memberId === member.id,
                    );
                    return (
                      <tr key={project.id}>
                        <td className="px-4 py-3.5 font-medium">{project.name}</td>
                        <td className="px-4 py-3.5 text-white/70">
                          {project.area?.name ??
                            (project.areaId ? `Área ${project.areaId}` : "Sin área")}
                        </td>
                        <td className="px-4 py-3.5 text-white/80">
                          {displayRole(projectMembership?.role)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill
                            value={
                              project.isArchived
                                ? "archived"
                                : (project.status ?? "active")
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {memberProjects.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-white/40">
                  No participas en ningún proyecto actualmente.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-white/8 bg-[#191822] p-6 lg:p-8">
            <h2 className="mb-4 text-lg font-bold">Historial de cuenta</h2>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-md border border-white/5 bg-[#171822] p-4">
                <p className="text-xs text-white/45">Fecha de registro</p>
                <p className="mt-1 font-semibold text-white/85">
                  {formatProfileDate(member.createdAt)}
                </p>
              </div>
              <div className="rounded-md border border-white/5 bg-[#171822] p-4">
                <p className="text-xs text-white/45">Última actualización</p>
                <p className="mt-1 font-semibold text-white/85">
                  {formatProfileDate(member.updatedAt)}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
