import { ConfigService } from '@nestjs/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { InitializeSchema1787788799998 } from '../migrations/1787788799998-InitializeSchema';
import { PrepareSearchNormalization1787788799999 } from '../migrations/1787788799999-PrepareSearchNormalization';
import { MigrateMemberRolesAndAreas1787788800000 } from '../migrations/1787788800000-MigrateMemberRolesAndAreas';
import { RepairMemberAreaMemberships1787788800001 } from '../migrations/1787788800001-RepairMemberAreaMemberships';
import { AddTaskCollaboration1787788800002 } from '../migrations/1787788800002-AddTaskCollaboration';
import { CreateAuditEventsTable1787788800003 } from '../migrations/1787788800003-CreateAuditEventsTable';
import { DeriveMemberAvailabilityFromTasks1787788800005 } from '../migrations/1787788800005-DeriveMemberAvailabilityFromTasks';
import { DeriveMemberActivityFromTasks1787788800004 } from '../migrations/1787788800004-DeriveMemberActivityFromTasks';
import { AddMemberDisabledSnapshotCutoff1787788800006 } from '../migrations/1787788800006-AddMemberDisabledSnapshotCutoff';
import { NormalizeSearchableText1787788800007 } from '../migrations/1787788800007-NormalizeSearchableText';
import { FinalizeSearchNormalization1787788800008 } from '../migrations/1787788800008-FinalizeSearchNormalization';
import { MigrateDefaultProjectPhasesToSpanish1787788800009 } from '../migrations/1787788800009-MigrateDefaultProjectPhasesToSpanish';

export const databaseMigrations = [
  InitializeSchema1787788799998,
  PrepareSearchNormalization1787788799999,
  MigrateMemberRolesAndAreas1787788800000,
  RepairMemberAreaMemberships1787788800001,
  AddTaskCollaboration1787788800002,
  CreateAuditEventsTable1787788800003,
  DeriveMemberActivityFromTasks1787788800004,
  DeriveMemberAvailabilityFromTasks1787788800005,
  AddMemberDisabledSnapshotCutoff1787788800006,
  NormalizeSearchableText1787788800007,
  FinalizeSearchNormalization1787788800008,
  MigrateDefaultProjectPhasesToSpanish1787788800009,
];

/** Preserve local defaults, allowing deployments to migrate before function startup. */
export function databaseOptions(
  config: ConfigService,
): PostgresConnectionOptions {
  const local = config.get<string>('NODE_ENV') === 'development';
  const migrationsRun = config.get<string>('DATABASE_MIGRATIONS_RUN');
  if (
    migrationsRun !== undefined &&
    migrationsRun !== 'true' &&
    migrationsRun !== 'false'
  ) {
    throw new Error('DATABASE_MIGRATIONS_RUN must be true or false');
  }
  const poolMax = config.get<string>('DATABASE_POOL_MAX');
  if (
    poolMax !== undefined &&
    (!/^[1-9]\d*$/.test(poolMax) || !Number.isSafeInteger(Number(poolMax)))
  ) {
    throw new Error('DATABASE_POOL_MAX must be a positive integer');
  }
  return {
    type: 'postgres',
    url: config.get<string>('DATABASE_URL'),
    synchronize: local,
    migrationsRun:
      migrationsRun === undefined ? !local : migrationsRun === 'true',
    ...(poolMax === undefined ? {} : { extra: { max: Number(poolMax) } }),
    migrations: databaseMigrations,
    ssl:
      config.get<string>('DATABASE_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false,
  };
}
