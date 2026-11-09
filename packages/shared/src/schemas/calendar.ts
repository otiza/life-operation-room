import { z } from 'zod';
import { ianaTimeZoneSchema } from './tasks.js';

export const calendarViewSchema = z.enum(['day', 'week', 'month', 'agenda']);
export const calendarEventKindSchema = z.enum(['event', 'time_block', 'due_chip']);
export const calendarMutationScopeSchema = z.enum(['this', 'following', 'all']);

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const calendarWorkingHoursSchema = z.object({
  startMinute: z.number().int().min(0).max(24 * 60 - 1),
  endMinute: z.number().int().min(1).max(24 * 60),
}).refine((value) => value.endMinute > value.startMinute, {
  message: 'endMinute must be greater than startMinute',
});

export const calendarSettingsSchema = z.object({
  weekStartsOn: z.number().int().min(0).max(6),
  workingHours: calendarWorkingHoursSchema,
  defaultEventDurationMinutes: z.number().int().min(5).max(24 * 60),
  secondaryTimeZone: ianaTimeZoneSchema.nullable(),
  defaultView: calendarViewSchema,
});

export const updateCalendarSettingsSchema = calendarSettingsSchema.partial();

export const DEFAULT_CALENDAR_SETTINGS = {
  weekStartsOn: 1,
  workingHours: { startMinute: 9 * 60, endMinute: 18 * 60 },
  defaultEventDurationMinutes: 60,
  secondaryTimeZone: null,
  defaultView: 'week',
} as const satisfies z.infer<typeof calendarSettingsSchema>;

const calendarColorSchema = z.string().min(1).max(64).nullable().optional();

const timedFieldsSchema = z.object({
  isAllDay: z.literal(false),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  startDate: z.null().optional(),
  endDate: z.null().optional(),
});

const allDayFieldsSchema = z.object({
  isAllDay: z.literal(true),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  startAt: z.null().optional(),
  endAt: z.null().optional(),
});

const createEventBaseSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  timezone: ianaTimeZoneSchema,
  rrule: z.string().max(1000).optional().nullable(),
  kind: z.enum(['event', 'time_block']).default('event'),
  color: calendarColorSchema,
});

export const createCalendarEventSchema = z.intersection(
  createEventBaseSchema,
  z.discriminatedUnion('isAllDay', [timedFieldsSchema, allDayFieldsSchema]),
).superRefine((value, ctx) => {
  if (!value.isAllDay && value.startAt && value.endAt && value.endAt <= value.startAt) {
    ctx.addIssue({ code: 'custom', message: 'endAt must be after startAt', path: ['endAt'] });
  }
  if (value.isAllDay && value.endDate <= value.startDate) {
    ctx.addIssue({ code: 'custom', message: 'endDate must be after startDate (exclusive end)', path: ['endDate'] });
  }
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  timezone: ianaTimeZoneSchema.optional(),
  rrule: z.string().max(1000).optional().nullable(),
  color: calendarColorSchema,
  isAllDay: z.boolean().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  startDate: calendarDateSchema.optional().nullable(),
  endDate: calendarDateSchema.optional().nullable(),
  scope: calendarMutationScopeSchema.default('all'),
  occurrenceStart: z.string().datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.scope !== 'all' && !value.occurrenceStart) {
    ctx.addIssue({ code: 'custom', message: 'occurrenceStart is required for this/following scope', path: ['occurrenceStart'] });
  }
});

export const deleteCalendarEventSchema = z.object({
  scope: calendarMutationScopeSchema.default('all'),
  occurrenceStart: z.string().datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.scope !== 'all' && !value.occurrenceStart) {
    ctx.addIssue({ code: 'custom', message: 'occurrenceStart is required for this/following scope', path: ['occurrenceStart'] });
  }
});

export const calendarDeleteUndoSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('soft_delete'), eventId: z.string().uuid() }),
  z.object({
    kind: z.literal('cancel_exception'),
    eventId: z.string().uuid(),
    occurrenceStart: z.string().datetime(),
  }),
  z.object({
    kind: z.literal('rrule_truncate'),
    eventId: z.string().uuid(),
    previousRrule: z.string().nullable(),
  }),
]);

export const undoCalendarDeleteSchema = calendarDeleteUndoSchema;

export const listCalendarEventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  tz: ianaTimeZoneSchema.default('UTC'),
}).superRefine((value, ctx) => {
  const fromMs = Date.parse(value.from);
  const toMs = Date.parse(value.to);
  if (!(toMs > fromMs)) {
    ctx.addIssue({ code: 'custom', message: 'to must be after from', path: ['to'] });
  }
  const maxRangeMs = 100 * 24 * 60 * 60 * 1000;
  if (toMs - fromMs > maxRangeMs) {
    ctx.addIssue({ code: 'custom', message: 'Range cannot exceed 100 days', path: ['to'] });
  }
});

export const createTimeBlockSchema = z.object({
  taskId: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
}).superRefine((value, ctx) => {
  if (value.end <= value.start) {
    ctx.addIssue({ code: 'custom', message: 'end must be after start', path: ['end'] });
  }
});

export const calendarEventTaskAnnotationSchema = z.object({
  taskId: z.string().uuid(),
  status: z.string().nullable(),
  deleted: z.boolean(),
});

export const calendarOccurrenceSchema = z.object({
  eventId: z.string().uuid(),
  occurrenceStart: z.string(),
  isRecurring: z.boolean(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  isAllDay: z.boolean(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  timezone: z.string(),
  rrule: z.string().nullable(),
  kind: calendarEventKindSchema,
  color: z.string().nullable(),
  source: z.string(),
  externalId: z.string().nullable(),
  createdByUserId: z.string().uuid().nullable(),
  task: calendarEventTaskAnnotationSchema.optional(),
});

export const calendarEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  isAllDay: z.boolean(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  timezone: z.string(),
  rrule: z.string().nullable(),
  kind: z.enum(['event', 'time_block']),
  color: z.string().nullable(),
  source: z.string(),
  externalId: z.string().nullable(),
  createdByUserId: z.string().uuid(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calendarIcsTokenStatusSchema = z.object({
  exists: z.boolean(),
  createdAt: z.string().nullable(),
});

export const calendarIcsTokenCreatedSchema = z.object({
  token: z.string(),
  urlPath: z.string(),
  createdAt: z.string(),
});

export type CalendarView = z.infer<typeof calendarViewSchema>;
export type CalendarEventKind = z.infer<typeof calendarEventKindSchema>;
export type CalendarMutationScope = z.infer<typeof calendarMutationScopeSchema>;
export type CalendarSettings = z.infer<typeof calendarSettingsSchema>;
export type UpdateCalendarSettingsInput = z.infer<typeof updateCalendarSettingsSchema>;
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type DeleteCalendarEventInput = z.infer<typeof deleteCalendarEventSchema>;
export type CalendarDeleteUndo = z.infer<typeof calendarDeleteUndoSchema>;
export type UndoCalendarDeleteInput = z.infer<typeof undoCalendarDeleteSchema>;
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
export type CreateTimeBlockInput = z.infer<typeof createTimeBlockSchema>;
export type CalendarOccurrence = z.infer<typeof calendarOccurrenceSchema>;
export type CalendarEventDto = z.infer<typeof calendarEventSchema>;
export type CalendarIcsTokenStatus = z.infer<typeof calendarIcsTokenStatusSchema>;
export type CalendarIcsTokenCreated = z.infer<typeof calendarIcsTokenCreatedSchema>;
