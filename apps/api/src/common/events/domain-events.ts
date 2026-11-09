export const DOMAIN_EVENTS = {
  memberInvited: 'member.invited',
  memberRemoved: 'member.removed',
  appInstalled: 'app.installed',
  appUninstalled: 'app.uninstalled',
  workspaceCreated: 'workspace.created',
  taskScheduled: 'task.scheduled',
  taskUpdated: 'task.updated',
  taskCompleted: 'task.completed',
  taskUnscheduled: 'task.unscheduled',
  taskAssigned: 'task.assigned',
  taskDeleted: 'task.deleted',
  taskRestored: 'task.restored',
  calendarEventStarting: 'calendar.event_starting',
} as const;

export type MemberInvitedEvent = {
  workspaceId: string;
  workspaceName: string;
  inviteeEmail: string;
  inviteeUserId: string | null;
  invitedByUserId: string;
  inviteToken: string;
  role: string;
};

export type MemberRemovedEvent = {
  workspaceId: string;
  userId: string;
  removedByUserId: string;
  memberId: string;
};

export type AppInstalledEvent = {
  workspaceId: string;
  appKey: string;
  installedByUserId: string;
};

export type AppUninstalledEvent = {
  workspaceId: string;
  appKey: string;
  uninstalledByUserId: string;
};

export type TaskDomainEvent = {
  workspaceId: string;
  taskId: string;
  projectId: string;
  title: string;
  status: string;
  dueAt: string | null;
  assigneeUserIds: string[];
  actorUserId: string;
  previousAssigneeUserId?: string | null;
  previousDueAt?: string | null;
};

/** Wire-only reminder hook — no delivery in this phase. */
export type CalendarEventStartingEvent = {
  workspaceId: string;
  eventId: string;
  occurrenceStart: string;
  title: string;
  startAt: string | null;
};
