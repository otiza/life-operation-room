export const DOMAIN_EVENTS = {
  memberInvited: 'member.invited',
  appInstalled: 'app.installed',
  appUninstalled: 'app.uninstalled',
  workspaceCreated: 'workspace.created',
  taskScheduled: 'task.scheduled',
  taskUpdated: 'task.updated',
  taskCompleted: 'task.completed',
  taskUnscheduled: 'task.unscheduled',
  taskAssigned: 'task.assigned',
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
  dueAt: string | null;
  assigneeUserIds: string[];
  actorUserId: string;
  previousAssigneeUserId?: string | null;
  previousDueAt?: string | null;
};
