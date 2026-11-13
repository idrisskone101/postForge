"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, Toast, type ToastMessage } from "@/components/workbench";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { useConfirmDialog } from "./confirm-dialog";
import { attentionCount } from "./integration-row-model";
import { IntegrationsPanel } from "./integrations-panel";
import { ModelsPanel } from "./models-panel";
import { ProviderCredentialsPanel } from "./provider-credentials-panel";
import { DEFAULT_SETTINGS, type SettingsRecord } from "./settings-record";
import { isSettingsTab, SettingsNavigation } from "./settings-navigation";
import { useSettingsIntegrations } from "./use-settings-integrations";
import type { IntegrationsWorkspace, SettingsTab } from "./types";
import { DeveloperSettingsPanel } from "./webhooks-panel";
import { Billing, SettingsForm, Team } from "./workspace-panels";

export function SettingsPageClient({ initialTab }: { initialTab: SettingsTab }) {
  const router = useRouter();
  const tab = useSyncExternalStore(subscribeSettingsTab, readSettingsTab, () => initialTab);
  const [settings, setSettings] = useState<SettingsRecord>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { confirm, dialog } = useConfirmDialog();
  const pushToast = useCallback((message: string) => {
    setToasts((current) => [...current, { id: `${Date.now()}-${current.length}`, tone: "ok", message }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const selectTab = useCallback(
    (next: SettingsTab) => {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", next);
      rememberSettingsTab(next);
      router.replace(`/settings?${params.toString()}`, { scroll: false });
      window.dispatchEvent(new Event("pf-settings-tab"));
    },
    [router]
  );
  const onOAuthCallback = useCallback(() => selectTab("integrations"), [selectTab]);
  const integrations = useSettingsIntegrations({
    onOAuthCallback,
    setError,
    setToast: pushToast,
    confirm,
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

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = { ...settings, updatedAt: new Date().toISOString() };
      await saveWorkspaceFeature("connections", next);
      setSettings(next);
      pushToast("Settings saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  const integrationsWorkspace: IntegrationsWorkspace = {
    providers: integrations.providers,
    loading: integrations.integrationsLoading,
    error: integrations.integrationsError,
    busyProvider: integrations.busyProvider,
    onRefresh: () => integrations.refreshIntegrations(true),
    onConnect: integrations.connectProvider,
    onSync: integrations.syncProvider,
    onDisconnect: integrations.disconnectProvider,
    onOpenWebhooks: () => selectTab("webhooks"),
  };

  let panel: ReactNode;
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
      panel = <ModelsPanel onSaved={pushToast} />;
      break;
    case "api-keys":
      panel = <ProviderCredentialsPanel onSaved={pushToast} />;
      break;
    case "webhooks":
      panel = <DeveloperSettingsPanel />;
      break;
    case "profile":
    case "publishing":
    case "notifications":
      panel = <SettingsForm form={{ tab, settings, setSettings, saving, onSave: save }} />;
      break;
    default: {
      const _exhaustive: never = tab;
      panel = _exhaustive;
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 min-[1280px]:flex-row min-[1280px]:items-start">
      <SettingsNavigation
        tab={tab}
        onSelect={selectTab}
        attention={attentionCount(integrations.providers)}
      />
      <section aria-label="Settings panel" data-settings-panel="true" className="flex min-w-0 flex-1 flex-col gap-3">
        {error && (
          <p role="alert" className="wb-notice break-words py-1.5 pr-1.5 [overflow-wrap:anywhere]" data-tone="bad">
            <span className="min-w-0 flex-1 py-1">{error}</span>
            <Button size={32} onClick={() => setError(null)}>
              Dismiss
            </Button>
          </p>
        )}
        <div key={tab} className="wb-fade-in flex min-w-0 flex-col gap-3">
          {panel}
        </div>
      </section>
      <div className="wb-toast-region">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
      {dialog}
    </div>
  );
}

let rememberedSettingsTab: SettingsTab | null = null;

function rememberSettingsTab(next: SettingsTab) {
  rememberedSettingsTab = next;
}

function readSettingsTab(): SettingsTab {
  if (rememberedSettingsTab) return rememberedSettingsTab;
  const requested = new URLSearchParams(window.location.search).get("tab");
  return requested && isSettingsTab(requested) ? requested : "integrations";
}

function subscribeSettingsTab(onChange: () => void) {
  const onPopState = () => {
    rememberedSettingsTab = null;
    onChange();
  };
  window.addEventListener("popstate", onPopState);
  window.addEventListener("pf-settings-tab", onChange);
  return () => {
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("pf-settings-tab", onChange);
  };
}
