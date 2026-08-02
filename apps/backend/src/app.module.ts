import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaModule } from './area/area.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from './members/members.module';
import { AreaMembershipsModule } from './area-memberships/area-memberships.module';
import { ProjectsModule } from './projects/projects.module';
import { MigrateMemberRolesAndAreas1787788800000 } from './migrations/1787788800000-MigrateMemberRolesAndAreas';
import { RepairMemberAreaMemberships1787788800001 } from './migrations/1787788800001-RepairMemberAreaMemberships';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseSslEnabled =
          config.get<string>('DATABASE_SSL') === 'true';

        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: true,
          ssl: databaseSslEnabled
            ? {
                rejectUnauthorized: false,
              }
            : false,
          migrations: [
            MigrateMemberRolesAndAreas1787788800000,
            RepairMemberAreaMemberships1787788800001,
          ],
          migrationsRun: true,
        };
      },
    }),
    AreaModule,
    MembersModule,
    AreaMembershipsModule,
    ProjectsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
