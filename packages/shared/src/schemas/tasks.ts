import { z } from 'zod';
import { isValidIanaTimeZone } from '../utils/timezone.js';

export const taskKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Key must be snake_case starting with a letter');

export const taskStatusSchema = z.string().min(1).max(64);
export const taskPrioritySchema = z.string().min(1).max(64);
export const taskDueFilterSchema = z.enum(['overdue', 'today', 'upcoming', 'none']);
export const taskAssigneeFilterSchema = z.enum(['me', 'anyone']);

export const ianaTimeZoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => isValidIanaTimeZone(value), { message: 'Invalid IANA timezone' });

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Invalid hex color');

export const taskStatusOptionSchema = z.object({
  key: taskKeySchema,
  label: z.string().min(1).max(80),
  color: hexColorSchema,
  order: z.number().int().min(0),
  enabled: z.boolean(),
  isDone: z.boolean().optional(),
});

export const taskPriorityOptionSchema = z.object({
  key: taskKeySchema,
  label: z.string().min(1).max(80),
  color: hexColorSchema,
  order: z.number().int().min(0),
  enabled: z.boolean(),
});

export const taskSettingsSchema = z.object({
  statuses: z.array(taskStatusOptionSchema).min(1),
  priorities: z.array(taskPriorityOptionSchema).min(1),
});

export const updateTaskSettingsSchema = taskSettingsSchema;

export const DEFAULT_TASK_SETTINGS = {
  statuses: [
    { key: 'todo', label: 'To do', color: '#a1a1aa', order: 0, enabled: true },
    { key: 'in_progress', label: 'In progress', color: '#3b82f6', order: 1, enabled: true },
    { key: 'done', label: 'Done', color: '#10b981', order: 2, enabled: true, isDone: true },
    { key: 'cancelled', label: 'Cancelled', color: '#d4d4d8', order: 3, enabled: true },
  ],
  priorities: [
    { key: 'none', label: 'None', color: '#e4e4e7', order: 0, enabled: true },
    { key: 'low', label: 'Low', color: '#38bdf8', order: 1, enabled: true },
    { key: 'medium', label: 'Medium', color: '#fbbf24', order: 2, enabled: true },
    { key: 'high', label: 'High', color: '#f97316', order: 3, enabled: true },
    { key: 'urgent', label: 'Urgent', color: '#ef4444', order: 4, enabled: true },
  ],
} as const satisfies z.infer<typeof taskSettingsSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  projectId: z.string().uuid(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeUserId: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  projectId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeUserId: z.string().uuid().optional().nullable(),
  position: z.number().int().optional(),
});

export const reorderTaskMoveSchema = z.object({
  taskId: z.string().uuid(),
  status: taskStatusSchema,
  position: z.number().int().min(0),
});

export const reorderTasksSchema = z.object({
  moves: z.array(reorderTaskMoveSchema).min(1).max(500),
});

export const listTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  assignee: taskAssigneeFilterSchema.optional(),
  due: taskDueFilterSchema.optional(),
  tz: ianaTimeZoneSchema.default('UTC'),
});

export const taskSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueAt: z.string().nullable(),
  assigneeUserId: z.string().uuid().nullable(),
  createdByUserId: z.string().uuid(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskDueFilter = z.infer<typeof taskDueFilterSchema>;
export type TaskAssigneeFilter = z.infer<typeof taskAssigneeFilterSchema>;
export type TaskStatusOption = z.infer<typeof taskStatusOptionSchema>;
export type TaskPriorityOption = z.infer<typeof taskPriorityOptionSchema>;
export type TaskSettings = z.infer<typeof taskSettingsSchema>;
export type UpdateTaskSettingsInput = z.infer<typeof updateTaskSettingsSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskDto = z.infer<typeof taskSchema>;
