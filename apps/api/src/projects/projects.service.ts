import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateProjectInput, UpdateProjectInput } from '@erp-tiza/shared';
import { projects, tasks, type Project, type User } from '../db/schema.js';
import {
  DOMAIN_EVENTS,
  type AppInstalledEvent,
  type AppUninstalledEvent,
} from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';
import { AppsService } from '../apps/apps.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';

const READ_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
const WRITE_ROLES = ['owner', 'admin', 'member'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly workspacesService: WorkspacesService,
    private readonly appsService: AppsService,
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspacesService.requireMembership(workspaceId, userId, [...READ_ROLES]);
    await this.appsService.assertInstalled(workspaceId, 'projects');
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.createdAt));
    return rows.map((row) => this.toDto(row));
  }

  async get(workspaceId: string, projectId: string, userId: string) {
    await this.workspacesService.requireMembership(workspaceId, userId, [...READ_ROLES]);
    await this.appsService.assertInstalled(workspaceId, 'projects');
    const project = await this.findInWorkspace(workspaceId, projectId);
    return this.toDto(project);
  }

  async create(workspaceId: string, user: User, input: CreateProjectInput) {
    await this.workspacesService.requireMembership(workspaceId, user.id, [...WRITE_ROLES]);
    await this.appsService.assertInstalled(workspaceId, 'projects');
    const [row] = await this.db
      .insert(projects)
      .values({
        workspaceId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? 'active',
        createdByUserId: user.id,
      })
      .returning();
    return this.toDto(row);
  }

  async update(workspaceId: string, projectId: string, user: User, input: UpdateProjectInput) {
    await this.workspacesService.requireMembership(workspaceId, user.id, [...WRITE_ROLES]);
    await this.appsService.assertInstalled(workspaceId, 'projects');
    await this.findInWorkspace(workspaceId, projectId);
    const [row] = await this.db
      .update(projects)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .returning();
    if (!row) throw new NotFoundException('Project not found');
    return this.toDto(row);
  }

  async remove(workspaceId: string, projectId: string, user: User) {
    await this.workspacesService.requireMembership(workspaceId, user.id, [...WRITE_ROLES]);
    await this.appsService.assertInstalled(workspaceId, 'projects');
    await this.findInWorkspace(workspaceId, projectId);
    // Soft integrity check against tasks.project_id (no FK / no TasksService import — avoids ESM cycle).
    const [row] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, projectId)));
    const taskCount = Number(row?.value ?? 0);
    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete project while ${taskCount} task(s) still reference it. Move or delete those tasks first, or archive the project.`,
      );
    }
    await this.db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
    return { ok: true };
  }

  /** Soft cross-app validation for Tasks (no FK). */
  async assertProjectInWorkspace(workspaceId: string, projectId: string): Promise<Project> {
    return this.findInWorkspace(workspaceId, projectId);
  }

  @OnEvent(DOMAIN_EVENTS.appInstalled)
  async onAppInstalled(event: AppInstalledEvent) {
    if (event.appKey !== 'projects') return;
    const existing = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, event.workspaceId))
      .limit(1);
    if (existing.length) return;
    await this.db.insert(projects).values({
      workspaceId: event.workspaceId,
      name: 'Inbox',
      description: 'Default project for uncategorized work.',
      status: 'active',
      createdByUserId: event.installedByUserId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.appUninstalled)
  async onAppUninstalled(event: AppUninstalledEvent) {
    if (event.appKey !== 'projects') return;
    await this.db.delete(projects).where(eq(projects.workspaceId, event.workspaceId));
  }

  private async findInWorkspace(workspaceId: string, projectId: string): Promise<Project> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  toDto(project: Project) {
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdByUserId: project.createdByUserId,
      createdAt: toIso(project.createdAt)!,
      updatedAt: toIso(project.updatedAt)!,
    };
  }
}
