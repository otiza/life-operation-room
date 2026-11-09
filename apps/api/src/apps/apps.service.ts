import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { APP_MANIFESTS, getAppManifest, type InstallAppInput } from '@erp-tiza/shared';
import { workspaceApps } from '../db/schema.js';
import type { User } from '../db/schema.js';
import { DOMAIN_EVENTS } from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';

@Injectable()
export class AppsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly workspacesService: WorkspacesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getCatalog() {
    return APP_MANIFESTS;
  }

  async listInstalled(workspaceId: string, userId: string) {
    await this.workspacesService.requireMembership(workspaceId, userId, [
      'owner',
      'admin',
      'member',
      'guest',
    ]);
    const rows = await this.db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, workspaceId));
    return rows.map((row) => this.toDto(row));
  }

  async install(workspaceId: string, user: User, input: InstallAppInput) {
    await this.workspacesService.requireMembership(workspaceId, user.id, ['owner', 'admin']);
    const manifest = getAppManifest(input.appKey);
    if (!manifest) {
      throw new NotFoundException(`Unknown app: ${input.appKey}`);
    }
    const installed = await this.db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, workspaceId));
    const installedKeys = new Set(installed.map((row) => row.appKey));
    if (installedKeys.has(manifest.key)) {
      throw new BadRequestException('App already installed');
    }
    const missingDeps = manifest.dependsOn.filter((dep) => !installedKeys.has(dep));
    if (missingDeps.length) {
      throw new BadRequestException(`Missing dependencies: ${missingDeps.join(', ')}`);
    }
    const [row] = await this.db
      .insert(workspaceApps)
      .values({
        workspaceId,
        appKey: manifest.key,
        config: input.config ?? {},
      })
      .returning();
    this.eventEmitter.emit(DOMAIN_EVENTS.appInstalled, {
      workspaceId,
      appKey: manifest.key,
      installedByUserId: user.id,
    });
    return this.toDto(row);
  }

  async uninstall(workspaceId: string, user: User, appKey: string) {
    await this.workspacesService.requireMembership(workspaceId, user.id, ['owner', 'admin']);
    const installed = await this.db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, workspaceId));
    const target = installed.find((row) => row.appKey === appKey);
    if (!target) {
      throw new NotFoundException('App is not installed');
    }
    const dependents = installed
      .map((row) => getAppManifest(row.appKey))
      .filter((manifest): manifest is NonNullable<typeof manifest> => Boolean(manifest))
      .filter((manifest) => manifest.dependsOn.includes(appKey))
      .map((manifest) => manifest.key);
    if (dependents.length) {
      throw new BadRequestException(`Cannot uninstall; required by: ${dependents.join(', ')}`);
    }
    await this.db
      .delete(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, appKey)));
    this.eventEmitter.emit(DOMAIN_EVENTS.appUninstalled, {
      workspaceId,
      appKey,
      uninstalledByUserId: user.id,
    });
    return { ok: true };
  }

  async assertInstalled(workspaceId: string, appKey: string) {
    const [row] = await this.db
      .select()
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, appKey)));
    if (!row) {
      throw new BadRequestException(`App ${appKey} is not installed in this workspace`);
    }
    return row;
  }

  private toDto(row: typeof workspaceApps.$inferSelect) {
    const manifest = getAppManifest(row.appKey);
    if (!manifest) {
      throw new NotFoundException(`Unknown installed app: ${row.appKey}`);
    }
    return {
      workspaceId: row.workspaceId,
      appKey: row.appKey,
      installedAt: toIso(row.installedAt)!,
      config: row.config ?? {},
      manifest,
    };
  }
}
