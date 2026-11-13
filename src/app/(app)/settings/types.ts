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

type ConnectHandler = (status: PublicIntegrationStatus, acceptPolicies?: boolean) => void;
type AccountHandler = (status: PublicIntegrationStatus, accountId: string) => void;

export type IntegrationsWorkspace = {
  providers: PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  busyProvider: SocialProvider | null;
  onRefresh: () => void;
  onConnect: ConnectHandler;
  onSync: AccountHandler;
  onDisconnect: AccountHandler;
  onOpenWebhooks: () => void;
};

export type SocialIntegrationCardModel = {
  provider: SocialProvider;
  status: PublicIntegrationStatus | null;
  loading: boolean;
  busy: boolean;
  onConnect: ConnectHandler;
  onSync: AccountHandler;
  onDisconnect: AccountHandler;
  onRefresh?: () => void;
  /** The one account whose Reconnect is the bone primary on screen. */
  primaryReconnectId?: string | null;
};

export type AccountRowModel = {
  providerStatus: PublicIntegrationStatus;
  account: PublicIntegrationStatus["accounts"][number];
  busy: boolean;
  primaryReconnect: boolean;
  canStartOAuth: boolean;
  onSync: AccountHandler;
  onDisconnect: AccountHandler;
  onReconnect: () => void;
};

export type SettingsFormModel = {
  tab: "profile" | "publishing" | "notifications";
  settings: SettingsRecord;
  setSettings: Dispatch<SetStateAction<SettingsRecord>>;
  saving: boolean;
  onSave: () => void;
};
