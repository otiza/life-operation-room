import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { projects } from '../db/schema.js';

export type ProjectReference = {
  id: string;
  name: string;
};

/** Narrow projects-owned queries other apps may call without importing the projects table. */
@Injectable()
export class ProjectReferencesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /** Soft cross-app validation (no FK between app tables). */
  async assertProjectInWorkspace(workspaceId: string, projectId: string): Promise<ProjectReference> {
    const [project] = await this.db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
