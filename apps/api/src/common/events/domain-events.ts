export const DOMAIN_EVENTS = {
  memberInvited: 'member.invited',
  appInstalled: 'app.installed',
  appUninstalled: 'app.uninstalled',
  workspaceCreated: 'workspace.created',
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
