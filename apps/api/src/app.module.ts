import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppsModule } from './apps/apps.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter.js';
import { HealthModule } from './health/health.module.js';
import { LinksModule } from './links/links.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import * as schema from './db/schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: minutes(1), limit: 10 }],
    }),
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        drizzle,
        connection: configService.getOrThrow<string>('DATABASE_URL'),
        schema,
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    AppsModule,
    NotificationsModule,
    LinksModule,
    ProjectsModule,
    TasksModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
  ],
})
export class AppModule {}
