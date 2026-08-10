import { AreaRole } from '../enums/area-role.enum';

export interface RequestAccessActor {
  role: AreaRole;
  areaId?: string;
  memberId?: string;
  projectIds?: string[];
  status?: string;
  readOnly?: boolean;
  snapshotAt?: Date;
  member?: {
    firstNames: string;
    lastNames: string;
  };
}
