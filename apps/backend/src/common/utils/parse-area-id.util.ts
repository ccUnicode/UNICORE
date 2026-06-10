import { ForbiddenException } from '@nestjs/common';

export const parseAreaId = (areaId: string | undefined): number => {
  const parsedAreaId = Number(areaId);

  if (!Number.isInteger(parsedAreaId) || parsedAreaId <= 0) {
    throw new ForbiddenException(
      'Area-scoped access requires a valid area header',
    );
  }

  return parsedAreaId;
};
