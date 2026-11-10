import { z } from 'zod';
import { calendarDateSchema } from './calendar.js';
import { ianaTimeZoneSchema } from './tasks.js';

export const noteDayQuerySchema = z.object({
  tz: ianaTimeZoneSchema.default('UTC'),
});

export const noteByDayParamsSchema = z.object({
  day: calendarDateSchema,
});

export const updateNoteBodySchema = z.object({
  body: z.string().max(100_000),
});

export const promoteChecklistLineSchema = z.object({
  lineIndex: z.number().int().min(0),
  checked: z.boolean().optional(),
});

export const noteSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  day: calendarDateSchema,
  body: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const promoteChecklistLineResultSchema = z.object({
  note: noteSchema,
  taskId: z.string().uuid(),
  created: z.boolean(),
});

export type NoteDayQuery = z.infer<typeof noteDayQuerySchema>;
export type UpdateNoteBodyInput = z.infer<typeof updateNoteBodySchema>;
export type PromoteChecklistLineInput = z.infer<typeof promoteChecklistLineSchema>;
export type Note = z.infer<typeof noteSchema>;
export type PromoteChecklistLineResult = z.infer<typeof promoteChecklistLineResultSchema>;
