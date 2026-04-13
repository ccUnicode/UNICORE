import { IncomingHttpHeaders } from 'http';
import { AreaRole } from '../enums/area-role.enum';
import { RequestAccessActor } from '../interfaces/request-access-actor.interface';

const AREA_ROLES = new Set(Object.values(AreaRole));

const normalizeHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0]?.trim();
  }

  return typeof value === 'string' ? value.trim() : undefined;
};

export const extractRequestAccessActor = (
  headers: IncomingHttpHeaders,
): RequestAccessActor | null => {
  const roleHeader = normalizeHeaderValue(headers['x-role'])?.toLowerCase();

  if (!roleHeader || !AREA_ROLES.has(roleHeader as AreaRole)) {
    return null;
  }

  const role = roleHeader as AreaRole;
  const areaId = normalizeHeaderValue(headers['x-area-id']);
  const memberId = normalizeHeaderValue(headers['x-member-id']);
  const projectIdsHeader = normalizeHeaderValue(headers['x-project-ids']);
  const projectIds = projectIdsHeader
    ?.split(',')
    .map((projectId) => projectId.trim())
    .filter((projectId) => projectId.length > 0);

  if (role === AreaRole.DIRECTIVA_DE_AREA && !areaId) {
    return null;
  }

  return {
    role,
    areaId: areaId || undefined,
    memberId: memberId || undefined,
    projectIds: projectIds?.length ? projectIds : undefined,
  };
};
