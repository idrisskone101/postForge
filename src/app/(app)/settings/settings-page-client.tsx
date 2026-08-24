"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CreditCard,
  KeyRound,
  Plug,
  Send,
  Settings2,
  UserRound,
  Users,
  Webhook,
  X,
} from "lucide-react";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";
import {
  IntegrationsPanel,
  type IntegrationsWorkspace,
} from "./integrations-panel";
import { ModelsPanel } from "./models-panel";
import { ProviderCredentialsPanel } from "./provider-credentials-panel";
import { DEFAULT_SETTINGS, type SettingsRecord } from "./settings-record";
import { useSettingsIntegrations } from "./use-settings-integrations";
import { DeveloperSettingsPanel } from "./webhooks-panel";
import { Billing, SettingsForm, Team } from "./workspace-panels";

export function SettingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") ?? "integrations";
  const tab: SettingsTab = isSettingsTab(requested) ? requested : "integrations";
  const [settings, setSettings] = useState<SettingsRecord>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const onOAuthCallback = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "integrations");
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const {
    providers,
    integrationsLoading,
    integrationsError,
    busyProvider,
    refreshIntegrations,
    connectProvider,
    syncProvider,
    disconnectProvider,
  } = useSettingsIntegrations({
    onOAuthCallback,
    setError,
    setToast,
  });

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<SettingsRecord>("connections")
      .then(({ records }) => {
        const saved = records.find((record) => record.id === "workspace-settings");
        if (!cancelled && saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load settings"));
    return () => {
      cancelled = true;
    };
  }, []);

  function selectTab(next: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = { ...settings, updatedAt: new Date().toISOString() };
      await saveWorkspaceFeature("connections", next);
      setSettings(next);
      setToast("Settings saved");
      window.setTimeout(() => setToast(null), 1700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  const integrationsWorkspace: IntegrationsWorkspace = {
    providers,
    loading: integrationsLoading,
    error: integrationsError,
    busyProvider,
    onRefresh: () => refreshIntegrations(true),
    onConnect: connectProvider,
    onSync: syncProvider,
    onDisconnect: disconnectProvider,
    onOpenWebhooks: () => selectTab("webhooks"),
  };

  let panel;
  switch (tab) {
    case "integrations":
      panel = <IntegrationsPanel workspace={integrationsWorkspace} />;
      break;
    case "billing":
      panel = <Billing />;
      break;
    case "team":
      panel = <Team />;
      break;
    case "models":
      panel = <ModelsPanel />;
      break;
    case "api-keys":
      panel = <ProviderCredentialsPanel />;
      break;
    case "webhooks":
      panel = <DeveloperSettingsPanel />;
      break;
    case "profile":
    case "publishing":
    case "notifications":
      panel = (
        <SettingsForm
          form={{
            tab,
            settings,
            setSettings,
            saving,
            onSave: save,
          }}
        />
      );
      break;
    default: {
      const _exhaustive: never = tab;
      panel = _exhaustive;
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-184px)] lg:grid-cols-[210px_minmax(0,1fr)]">
      <SettingsNavigation
        tab={tab}
        onSelect={selectTab}
        connectedIntegrations={providers.reduce(
          (sum, provider) => sum + provider.accounts.length,
          0
        )}
      />

      <section aria-label="Settings panel" className="min-w-0 px-5 py-6 sm:px-7 lg:px-8">
        {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error"><X className="size-3.5" /></button></div>}
        {panel}
      </section>

      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[90] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}


export const SETTINGS_NAVIGATION = [
  { id: "profile", label: "Profile", group: "workspace", icon: UserRound },
  { id: "models", label: "Available models", group: "workspace", icon: Settings2 },
  { id: "billing", label: "Billing & usage", group: "workspace", icon: CreditCard },
  { id: "integrations", label: "Integrations", group: "workspace", icon: Plug },
  { id: "publishing", label: "Publishing defaults", group: "workspace", icon: Send },
  { id: "team", label: "Team", group: "workspace", icon: Users },
  { id: "notifications", label: "Notifications", group: "workspace", icon: Bell },
  { id: "api-keys", label: "API keys", group: "developer", icon: KeyRound },
  { id: "webhooks", label: "Webhooks", group: "developer", icon: Webhook },
] as const;

export type SettingsTab = (typeof SETTINGS_NAVIGATION)[number]["id"];

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_NAVIGATION.some((item) => item.id === value);
}

export function SettingsNavigation({
  tab,
  onSelect,
  connectedIntegrations = 0,
}: {
  tab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  connectedIntegrations?: number;
}) {
  return (
    <aside className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b border-border bg-[var(--pf-active)] p-3 lg:block lg:border-b-0 lg:border-r lg:p-4">
      <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:block">Workspace</p>
      {SETTINGS_NAVIGATION.filter((item) => item.group === "workspace").map(
        ({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[12px] text-muted-foreground lg:w-full",
              tab === id && "bg-white font-semibold text-foreground shadow-sm"
            )}
          >
            <Icon className={cn("size-3.5", tab === id && "text-[var(--pf-orange)]")} />
            {label}
            {id === "integrations" && connectedIntegrations > 0 && (
              <span aria-label={`${connectedIntegrations} connected integrations`} className="ml-auto grid size-4 place-items-center rounded-full bg-[var(--pf-orange)] text-[11px] text-white">
                {connectedIntegrations}
              </span>
            )}
          </button>
        )
      )}
      <div className="my-4 hidden h-px bg-[var(--pf-border)] lg:block" />
      <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:block">Developer</p>
      {SETTINGS_NAVIGATION.filter((item) => item.group === "developer").map(
        ({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[12px] text-muted-foreground lg:w-full",
              tab === id && "bg-white font-semibold text-foreground shadow-sm"
            )}
          >
            <Icon className={cn("size-3.5", tab === id && "text-[var(--pf-orange)]")} />
            {label}
          </button>
        )
      )}
    </aside>
  );
}