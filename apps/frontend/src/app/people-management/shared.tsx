"use client";

import type { ReactNode } from "react";
import { ApiError } from "@/lib/auth-client";
import type { ManagedMember } from "../people-management.types";

export const fieldClass =
  "h-11 w-full rounded-md border border-white/10 bg-[#171822] px-3 text-sm text-white outline-none focus:border-[#7478ff]";
export const labelClass = "grid gap-2 text-sm font-semibold text-white/70";
export const primaryButton =
  "rounded-md bg-[#7478ff] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#8589ff] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10";
export const dangerButton =
  "rounded-md border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50";

export function memberName(member: ManagedMember): string {
  return `${member.firstNames} ${member.lastNames}`.trim();
}

export function displayCycle(cycle?: number | null): string {
  if (!cycle) return "Sin ciclo";
  const suffixes: Record<number, string> = {
    1: "ro",
    2: "vo",
    3: "er",
    4: "to",
    5: "to",
    6: "to",
    7: "vo",
    8: "vo",
    9: "no",
    10: "mo",
  };
  return `${cycle}${suffixes[cycle] ?? "°"}`;
}

export function messageFrom(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "No se pudo completar la operación.";
}

export function statusClass(status?: string): string {
  switch (status) {
    case "active":
    case "available":
      return "bg-lime-400/80 text-lime-950";
    case "inactive":
    case "disabled":
      return "bg-rose-300 text-rose-950";
    case "not_available":
      return "bg-amber-300 text-amber-950";
    case "archived":
      return "bg-rose-300 text-rose-950";
    default:
      return "bg-white/15 text-white/75";
  }
}

export const statusLabels: Record<string, string> = {
  active: "Activo",
  available: "Disponible",
  inactive: "Inactivo",
  disabled: "Inhabilitado",
  not_available: "No disponible",
  archived: "Archivada",
  planned: "Planificado",
  on_hold: "En pausa",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function displayStatus(value?: string): string {
  if (!value) return "N/D";
  return statusLabels[value] ?? value.replaceAll("_", " ");
}

export function displayRole(value?: string): string {
  if (!value) return "Miembro";
  const roles: Record<string, string> = {
    miembro: "Miembro",
    member: "Miembro",
    presidencia: "Presidencia",
    directiva_de_area: "Directiva",
    representative: "Representante",
    subrepresentative: "Subrepresentante",
  };
  return roles[value] ?? value.replaceAll("_", " ");
}

export function StatusPill({ value }: { value?: string }) {
  return (
    <span
      className={`rounded px-2 py-1 text-[11px] font-bold ${statusClass(value)}`}
    >
      {displayStatus(value)}
    </span>
  );
}

export function Feedback({
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

export function Modal({
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

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-9">
      <div>
        <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-[72px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-3xl text-base text-white/55">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SearchField({
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

