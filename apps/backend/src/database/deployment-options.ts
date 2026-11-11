import { ConfigService } from '@nestjs/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { databaseOptions } from './database-options';

/** Require the environment's direct connection; never fall back to the runtime pooler. */
export function deploymentOptions(
  config: ConfigService,
): PostgresConnectionOptions {
  const url = config.get<string>('DATABASE_URL_UNPOOLED');
  if (!url?.trim()) {
    throw new Error('DATABASE_URL_UNPOOLED is required for migration:deploy');
  }
  return {
    ...databaseOptions(config),
    url,
    synchronize: false,
    migrationsRun: false,
  };
}
