import { ApiError, getJson } from "../lib/auth-client";
import type { ManagedMember } from "./people-management.types";

export const MEMBER_PROFILE_MESSAGES = {
  unauthorized: {
    title: "Acceso restringido",
    description: "Tu rol no tiene permisos para consultar este perfil.",
  },
  notFound: {
    title: "Miembro no encontrado",
    description:
      "El perfil solicitado no existe o no está disponible para tu cuenta.",
  },
  error: {
    title: "No pudimos cargar el perfil",
    description:
      "Ocurrió un problema al consultar la información. Inténtalo nuevamente.",
  },
} as const;

export type MemberProfileLoadResult =
  | { status: "ready"; member: ManagedMember }
  | { status: "unauthorized"; title: string; description: string }
  | { status: "not-found"; title: string; description: string }
  | { status: "error"; title: string; description: string };

type MemberProfileRequest = <T>(
  path: string,
  accessToken: string,
) => Promise<T>;

export function canViewMemberProfiles(role?: string): boolean {
  const normalizedRole = role?.trim().toLowerCase();
  return normalizedRole === "presidencia" || normalizedRole === "directiva_de_area";
}

export function canViewInternalMemberProfileFields(role?: string): boolean {
  return canViewMemberProfiles(role);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeMemberProfile(
  payload: unknown,
  viewerRole: string,
): ManagedMember | null {
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  const id = optionalNumber(value.id);
  if (!id || !Number.isInteger(id)) return null;

  const canViewInternal = canViewInternalMemberProfileFields(viewerRole);
  const rawSkills = Array.isArray(value.skills) ? value.skills : [];
  const rawMemberships = Array.isArray(value.memberships)
    ? value.memberships
    : [];

  return {
    id,
    firstNames: stringValue(value.firstNames),
    lastNames: stringValue(value.lastNames),
    major: stringValue(value.major, "Sin carrera registrada"),
    role: stringValue(value.role, "miembro"),
    cycle: optionalNumber(value.cycle) ?? null,
    areaId: optionalNumber(value.areaId) ?? null,
    institution: canViewInternal ? optionalString(value.institution) : undefined,
    studentCode: canViewInternal
      ? optionalNullableString(value.studentCode)
      : undefined,
    birthDate: canViewInternal
      ? optionalNullableString(value.birthDate)
      : undefined,
    activityStatus: canViewInternal
      ? optionalString(value.activityStatus)
      : undefined,
    availabilityStatus: canViewInternal
      ? optionalString(value.availabilityStatus)
      : undefined,
    createdAt: optionalString(value.createdAt),
    updatedAt: optionalString(value.updatedAt),
    skills: rawSkills.flatMap((skill) => {
      if (!skill || typeof skill !== "object") return [];
      const item = skill as Record<string, unknown>;
      const name = stringValue(item.name).trim();
      if (!name) return [];
      return [{ id: optionalNumber(item.id), name }];
    }),
    memberships: rawMemberships.flatMap((membership) => {
      if (!membership || typeof membership !== "object") return [];
      const item = membership as Record<string, unknown>;
      const rawArea =
        item.area && typeof item.area === "object"
          ? (item.area as Record<string, unknown>)
          : undefined;
      const areaId = optionalNumber(item.areaId) ?? null;
      return [
        {
          id: optionalNumber(item.id),
          areaId,
          role: optionalString(item.role),
          area:
            rawArea && optionalNumber(rawArea.id)
              ? {
                  id: optionalNumber(rawArea.id)!,
                  name: stringValue(rawArea.name, "Área sin nombre"),
                  description: optionalNullableString(rawArea.description) ?? null,
                  isArchived:
                    typeof rawArea.isArchived === "boolean"
                      ? rawArea.isArchived
                      : undefined,
                }
              : undefined,
        },
      ];
    }),
  };
}

function state(
  status: "unauthorized" | "not-found" | "error",
): Exclude<MemberProfileLoadResult, { status: "ready" }> {
  const message =
    status === "not-found"
      ? MEMBER_PROFILE_MESSAGES.notFound
      : MEMBER_PROFILE_MESSAGES[status];
  return { status, ...message };
}

export async function loadMemberProfile(
  memberId: number,
  accessToken: string,
  viewerRole: string,
  request: MemberProfileRequest = getJson,
): Promise<MemberProfileLoadResult> {
  if (!canViewMemberProfiles(viewerRole)) return state("unauthorized");

  try {
    const payload = await request<unknown>("/members", accessToken);
    if (!Array.isArray(payload)) return state("error");

    const member = payload
      .map((item) => normalizeMemberProfile(item, viewerRole))
      .find((item) => item?.id === memberId);

    return member ? { status: "ready", member } : state("not-found");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return state("unauthorized");
    }
    return state("error");
  }
}

export function formatProfileDate(value?: string): string {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
