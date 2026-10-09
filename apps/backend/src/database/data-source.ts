import 'reflect-metadata';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database-options';

// CLI uses environment variables explicitly; it never enables synchronization.
export default new DataSource({
  ...databaseOptions(new ConfigService()),
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
});
