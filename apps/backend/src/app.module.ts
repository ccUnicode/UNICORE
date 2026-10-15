import { databaseOptions } from './database/database-options';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaModule } from './area/area.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from './members/members.module';
import { AreaMembershipsModule } from './area-memberships/area-memberships.module';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';
import { SnapshotResponseInterceptor } from './common/interceptors/snapshot-response.interceptor';
import { SkillsModule } from './skills/skills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...databaseOptions(config),
        autoLoadEntities: true,
      }),
    }),
    AreaModule,
    MembersModule,
    AreaMembershipsModule,
    ProjectsModule,
    AuthModule,
    TasksModule,
    AuditModule,
    SkillsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: SnapshotResponseInterceptor },
  ],
})
export class AppModule {}
