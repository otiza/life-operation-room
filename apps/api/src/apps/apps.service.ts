import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { APP_MANIFESTS, getAppManifest, type InstallAppInput } from '@life-room/shared';
import { workspaceApps } from '../db/schema.js';
import type { User } from '../db/schema.js';
import { DOMAIN_EVENTS } from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';

@Injectable()
export class AppsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Only shipped apps are listed. `coming_soon` manifests stay in code as the roadmap. */
  getCatalog() {
    return APP_MANIFESTS.filter((manifest) => manifest.status === 'available');
  }

  async listInstalled(workspaceId: string) {
    const rows = await this.db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, workspaceId));
    return rows.map((row) => this.toDto(row));
  }

  async install(workspaceId: string, user: User, input: InstallAppInput) {
    const manifest = getAppManifest(input.appKey);
    if (!manifest) {
      throw new NotFoundException(`Unknown app: ${input.appKey}`);
    }
    if (manifest.status !== 'available') {
      throw new BadRequestException(`${manifest.name} is not available yet`);
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
    await this.eventEmitter.emitAsync(DOMAIN_EVENTS.appInstalled, {
      workspaceId,
      appKey: manifest.key,
      installedByUserId: user.id,
    });
    const [updated] = await this.db
      .select()
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, manifest.key)));
    return this.toDto(updated ?? row);
  }

  async updateConfig(workspaceId: string, appKey: string, config: Record<string, unknown>) {
    const [row] = await this.db
      .update(workspaceApps)
      .set({ config })
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, appKey)))
      .returning();
    if (!row) throw new NotFoundException(`App ${appKey} is not installed in this workspace`);
    return this.toDto(row);
  }

  async uninstall(workspaceId: string, user: User, appKey: string) {
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
    await this.eventEmitter.emitAsync(DOMAIN_EVENTS.appUninstalled, {
      workspaceId,
      appKey,
      uninstalledByUserId: user.id,
    });
    return { ok: true };
  }

  async isInstalled(workspaceId: string, appKey: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: workspaceApps.id })
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, appKey)));
    return Boolean(row);
  }

  async assertInstalled(workspaceId: string, appKey: string) {
    const [row] = await this.db
      .select()
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, appKey)));
    if (!row) {
      throw new ForbiddenException(`App ${appKey} is not installed in this workspace`);
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
