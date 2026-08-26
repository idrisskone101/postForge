import type { Dispatch, SetStateAction } from "react";
import type {
  PublicIntegrationStatus,
  SocialProvider,
} from "@/lib/integrations-client";
import type { SettingsRecord } from "./settings-record";

export type SettingsTab =
  | "profile"
  | "models"
  | "billing"
  | "integrations"
  | "publishing"
  | "team"
  | "notifications"
  | "api-keys"
  | "webhooks";

export type IntegrationsWorkspace = {
  providers: PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  busyProvider: SocialProvider | null;
  onRefresh: () => void;
  onConnect: (
    status: PublicIntegrationStatus,
    acceptPolicies?: boolean
  ) => void;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
  onOpenWebhooks: () => void;
};

export type SocialIntegrationCardModel = {
  provider: SocialProvider;
  status: PublicIntegrationStatus | null;
  loading: boolean;
  busy: boolean;
  onConnect: (
    status: PublicIntegrationStatus,
    acceptPolicies?: boolean
  ) => void;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
};

export type AccountRowModel = {
  providerStatus: PublicIntegrationStatus;
  displayName: string;
  account: PublicIntegrationStatus["accounts"][number];
  busy: boolean;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
  onReconnect: () => void;
  canStartOAuth: boolean;
};

export type ConnectedAccountsModel = {
  status: PublicIntegrationStatus;
  displayName: string;
  busy: boolean;
  canStartOAuth: boolean;
  youtubePolicyConsent: boolean;
  onSync: SocialIntegrationCardModel["onSync"];
  onDisconnect: SocialIntegrationCardModel["onDisconnect"];
  onConnect: SocialIntegrationCardModel["onConnect"];
};

export type SettingsFormModel = {
  tab: string;
  settings: SettingsRecord;
  setSettings: Dispatch<SetStateAction<SettingsRecord>>;
  saving: boolean;
  onSave: () => void;
};
