"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { API_URL } from "@/lib/auth-client";
import { fullName } from "./dashboard.model";
import type { Member, Project } from "./dashboard.types";

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
    <div
      className={`relative overflow-hidden ${compact ? "h-10 w-36" : "h-[73px] w-[202px]"}`}
    >
      <Image
        src="/unicore/unicore-logo.png"
        alt="UNICORE"
        fill
        sizes={compact ? "144px" : "202px"}
        className="object-cover"
        priority
      />
    </div>
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
        <Panel title="Estado de datos">
          <StackList
            items={[
              { title: "Backend API", subtitle: API_URL, meta: "Conectado" },
              {
                title: "Modo de acceso",
                subtitle: authRole,
                meta: "Bearer",
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

export function ProfileView({
  member,
  onLogout,
}: {
  member: Member;
  onLogout: () => void;
}) {
  return (
    <div>
      <SectionTitle title="Perfil" />
      <Panel title="Sesión actual">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoRow label="Miembro" value={fullName(member)} />
          <InfoRow label="Rol" value={member.role} />
          <InfoRow
            label="Área"
            value={
              member.area?.name ??
              (member.areaId ? `Área ${member.areaId}` : "Todas")
            }
          />
          <InfoRow label="API" value={API_URL.replace(/^https?:\/\//, "")} />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-6 rounded-md bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12"
        >
          Cerrar sesión
        </button>
      </Panel>
    </div>
  );
}
