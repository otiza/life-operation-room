import { Injectable } from '@nestjs/common';
import type { CreateTaskInput } from '@life-room/shared';
import type { User } from '../db/schema.js';
import { TasksService } from './tasks.service.js';

/** Task writes other apps may perform. Keeps callers off the full TasksService surface. */
@Injectable()
export class TaskCommandsService {
  constructor(private readonly tasksService: TasksService) {}

  async create(workspaceId: string, user: User, input: CreateTaskInput): Promise<{ id: string }> {
    const task = await this.tasksService.create(workspaceId, user, input);
    return { id: task.id };
  }
}
