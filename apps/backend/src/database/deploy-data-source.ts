import 'reflect-metadata';
import { join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { deploymentOptions } from './deployment-options';

void ConfigModule.forRoot({ envFilePath: join(__dirname, '../../.env') });

export default new DataSource({
  ...deploymentOptions(new ConfigService()),
  entities: [join(__dirname, '../**/*.entity.js')],
});
