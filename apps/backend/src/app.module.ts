import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from './members/members.module';

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
        };
      },
    }),
    MembersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
