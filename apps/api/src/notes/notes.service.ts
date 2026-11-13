import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  calendarDateKeyInTimeZone,
  getChecklistBlock,
  normalizeNoteMarkdown,
  replaceChecklistLine,
  setChecklistTaskId,
  type PromoteChecklistLineInput,
  type UpdateNoteBodyInput,
} from '@life-room/shared';
import { AppsService } from '../apps/apps.service.js';
import { toIso } from '../common/utils/crypto.js';
import { notes, type Note, type User } from '../db/schema.js';
import { LinksService } from '../links/links.service.js';
import { TaskCommandsService } from '../tasks/task-commands.service.js';

const CHECKLIST_LINK_TYPE = 'checklist';

@Injectable()
export class NotesService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly appsService: AppsService,
    private readonly linksService: LinksService,
    private readonly taskCommands: TaskCommandsService,
  ) {}

  async getOrCreateToday(workspaceId: string, timeZone: string) {
    const day = calendarDateKeyInTimeZone(new Date(), timeZone);
    return this.getOrCreateByDay(workspaceId, day);
  }

  async getOrCreateByDay(workspaceId: string, day: string) {
    const existing = await this.findByDay(workspaceId, day);
    if (existing) return this.toDto(existing);
    try {
      const [created] = await this.db
        .insert(notes)
        .values({ workspaceId, day, body: '' })
        .returning();
      return this.toDto(created);
    } catch {
      const raced = await this.findByDay(workspaceId, day);
      if (raced) return this.toDto(raced);
      throw new BadRequestException('Could not create note for day');
    }
  }

  async updateBody(workspaceId: string, noteId: string, input: UpdateNoteBodyInput) {
    const existing = await this.findInWorkspace(workspaceId, noteId);
    const body = normalizeNoteMarkdown(input.body);
    const [updated] = await this.db
      .update(notes)
      .set({ body, updatedAt: new Date() })
      .where(and(eq(notes.id, existing.id), eq(notes.workspaceId, workspaceId)))
      .returning();
    if (!updated) throw new NotFoundException('Note not found');
    return this.toDto(updated);
  }

  async promoteChecklistLine(
    workspaceId: string,
    noteId: string,
    user: User,
    input: PromoteChecklistLineInput,
  ) {
    const existing = await this.findInWorkspace(workspaceId, noteId);
    const day = String(existing.day).slice(0, 10);
    let block;
    try {
      block = getChecklistBlock(existing.body, input.lineIndex);
    } catch {
      throw new BadRequestException('Checklist line not found');
    }

    if (block.taskId) {
      const note =
        input.checked === undefined
          ? this.toDto(existing)
          : await this.updateBody(workspaceId, noteId, {
              body: replaceChecklistLine(existing.body, input.lineIndex, (line) => ({
                ...line,
                checked: input.checked!,
              })),
            });
      return { note, taskId: block.taskId, created: false };
    }

    const tasksInstalled = await this.appsService.isInstalled(workspaceId, 'tasks');
    if (!tasksInstalled) {
      throw new BadRequestException('Tasks is required to turn a checklist line into a task');
    }

    const title = block.text.trim() || 'Untitled';
    const task = await this.taskCommands.create(workspaceId, user, {
      title,
      whenDate: day,
    });

    const body = replaceChecklistLine(existing.body, input.lineIndex, (line) =>
      setChecklistTaskId(line, task.id, input.checked ?? true),
    );
    const [updated] = await this.db
      .update(notes)
      .set({ body, updatedAt: new Date() })
      .where(and(eq(notes.id, existing.id), eq(notes.workspaceId, workspaceId)))
      .returning();
    if (!updated) throw new NotFoundException('Note not found');

    await this.linksService.create({
      workspaceId,
      sourceApp: 'notes',
      sourceRef: `${existing.id}:${task.id}`,
      targetApp: 'tasks',
      targetRef: task.id,
      linkType: CHECKLIST_LINK_TYPE,
    });

    return { note: this.toDto(updated), taskId: task.id, created: true };
  }

  private async findByDay(workspaceId: string, day: string) {
    const [row] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.workspaceId, workspaceId), eq(notes.day, day)))
      .limit(1);
    return row ?? null;
  }

  private async findInWorkspace(workspaceId: string, noteId: string) {
    const [row] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId)))
      .limit(1);
    if (!row) throw new NotFoundException('Note not found');
    return row;
  }

  private toDto(row: Note) {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      day: String(row.day).slice(0, 10),
      body: row.body,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
