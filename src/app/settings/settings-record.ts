export type SettingsRecord = {
  id: string;
  workspaceName: string;
  timezone: string;
  approvalDefault: boolean;
  emailFailures: boolean;
  emailApprovals: boolean;
  updatedAt: string;
};

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: "workspace-settings",
  workspaceName: "PostForge Studio",
  timezone: "America/Toronto",
  approvalDefault: true,
  emailFailures: true,
  emailApprovals: false,
  updatedAt: new Date(0).toISOString(),
};
