import { boolean, date, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, index } from 'drizzle-orm/pg-core';

export const workspaceKindEnum = pgEnum('workspace_kind', ['personal', 'shared']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member', 'guest']);
export const memberStatusEnum = pgEnum('member_status', ['invited', 'active']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  kind: workspaceKindEnum('kind').notNull(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: memberRoleEnum('role').notNull(),
  status: memberStatusEnum('status').notNull(),
  inviteToken: text('invite_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_members_workspace_email_idx').on(table.workspaceId, table.email),
]);

export const workspaceApps = pgTable('workspace_apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  appKey: text('app_key').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_apps_workspace_app_idx').on(table.workspaceId, table.appKey),
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const crossAppLinks = pgTable('cross_app_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceApp: text('source_app').notNull(),
  sourceRef: text('source_ref').notNull(),
  targetApp: text('target_app').notNull(),
  targetRef: text('target_ref').notNull(),
  linkType: text('link_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Reserved for wearable / OAuth connectors — not used in phase 1. */
export const integrationAccounts = pgTable('integration_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  encryptedTokens: text('encrypted_tokens').notNull().default(''),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('integration_accounts_user_provider_idx').on(table.userId, table.provider),
]);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('active'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('projects_workspace_id_idx').on(table.workspaceId),
]);

/** project_id is a soft UUID ref to projects (no cross-app FK). */
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('none'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  assigneeUserId: uuid('assignee_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('tasks_workspace_id_idx').on(table.workspaceId),
  index('tasks_workspace_project_idx').on(table.workspaceId, table.projectId),
  index('tasks_workspace_status_idx').on(table.workspaceId, table.status),
]);

/** Timed events use start_at/end_at; all-day uses start_date/end_date (exclusive end). */
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  timezone: text('timezone').notNull().default('UTC'),
  rrule: text('rrule'),
  kind: text('kind').notNull().default('event'),
  color: text('color'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull().default('local'),
  externalId: text('external_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('calendar_events_workspace_start_at_idx').on(table.workspaceId, table.startAt),
  index('calendar_events_workspace_end_at_idx').on(table.workspaceId, table.endAt),
  index('calendar_events_workspace_start_date_idx').on(table.workspaceId, table.startDate),
  index('calendar_events_workspace_deleted_at_idx').on(table.workspaceId, table.deletedAt),
]);

export const calendarEventExceptions = pgTable('calendar_event_exceptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  originalOccurrenceStart: timestamp('original_occurrence_start', { withTimezone: true }).notNull(),
  cancelled: boolean('cancelled').notNull().default(false),
  title: text('title'),
  description: text('description'),
  location: text('location'),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isAllDay: boolean('is_all_day'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('calendar_event_exceptions_event_occurrence_idx').on(table.eventId, table.originalOccurrenceStart),
  index('calendar_event_exceptions_workspace_idx').on(table.workspaceId),
]);

export const calendarFeedTokens = pgTable('calendar_feed_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  index('calendar_feed_tokens_workspace_user_idx').on(table.workspaceId, table.userId),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceApp = typeof workspaceApps.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type CalendarEventException = typeof calendarEventExceptions.$inferSelect;
export type CalendarFeedToken = typeof calendarFeedTokens.$inferSelect;
