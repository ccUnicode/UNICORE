import 'reflect-metadata';
import { join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database-options';

// Match the application .env setup, preserving precedence of injected variables.
void ConfigModule.forRoot({ envFilePath: join(__dirname, '../../.env') });

// The CLI never synchronizes the schema or runs migrations implicitly.
export default new DataSource({
  ...databaseOptions(new ConfigService()),
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
});
