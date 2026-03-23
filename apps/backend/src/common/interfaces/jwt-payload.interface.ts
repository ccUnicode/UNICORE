import { AreaRole } from '../enums/area-role.enum';

export interface JwtPayload {
  /** userId */
  sub: string;
  role: AreaRole;
  /** Requerido para DIRECTIVA_DE_AREA y MIEMBRO */
  areaId?: string;
}
