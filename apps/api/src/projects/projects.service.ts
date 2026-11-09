import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateProjectInput, UpdateProjectInput } from '@erp-tiza/shared';
import { projects, type Project, type User } from '../db/schema.js';
import {
  DOMAIN_EVENTS,
  type AppInstalledEvent,
  type AppUninstalledEvent,
} from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';
import { TaskReferencesService } from '../tasks/task-references.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly taskReferencesService: TaskReferencesService,
  ) {}

  async list(workspaceId: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.createdAt));
    return rows.map((row) => this.toDto(row));
  }

  async get(workspaceId: string, projectId: string) {
    const project = await this.findInWorkspace(workspaceId, projectId);
    return this.toDto(project);
  }

  async create(workspaceId: string, user: User, input: CreateProjectInput) {
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

  async update(workspaceId: string, projectId: string, input: UpdateProjectInput) {
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

  async remove(workspaceId: string, projectId: string) {
    await this.findInWorkspace(workspaceId, projectId);
    const taskCount = await this.taskReferencesService.countByProject(workspaceId, projectId);
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
    // Inbox is tasks with project_id null — do not seed a project named Inbox.
    if (event.appKey !== 'projects') return;
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
