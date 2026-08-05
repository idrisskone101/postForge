"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  CircleDollarSign,
  Code2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageSquare,
  Plug,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Unplug,
  UserRound,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import {
  beginIntegrationConnection,
  disconnectIntegration,
  fetchIntegrations,
  LOCAL_INTEGRATION_DELETE_CONFIRMATION,
  SOCIAL_PROVIDERS,
  syncIntegration,
  type ConnectedIntegrationAccountStatus,
  type PublicIntegrationStatus,
  type SocialProvider,
} from "@/lib/integrations-client";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

type SettingsRecord = {
  id: string;
  workspaceName: string;
  timezone: string;
  approvalDefault: boolean;
  emailFailures: boolean;
  emailApprovals: boolean;
  updatedAt: string;
};

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
    <aside className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b border-[#DEDFD8] bg-[#F0F1EB] p-3 lg:block lg:border-b-0 lg:border-r lg:p-4">
      <p className="pf-eyebrow mb-2 hidden px-2 lg:block">Workspace</p>
      {SETTINGS_NAVIGATION.filter((item) => item.group === "workspace").map(
        ({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-[7px] px-3 text-[10px] text-[#71726D] lg:w-full",
              tab === id && "bg-white font-semibold text-[#232323] shadow-sm"
            )}
          >
            <Icon className={cn("size-3.5", tab === id && "text-[#FF4A20]")} />
            {label}
            {id === "integrations" && connectedIntegrations > 0 && (
              <span aria-label={`${connectedIntegrations} connected integrations`} className="ml-auto grid size-4 place-items-center rounded-full bg-[#FF4A20] text-[9px] text-white">
                {connectedIntegrations}
              </span>
            )}
          </button>
        )
      )}
      <div className="my-4 hidden h-px bg-[#DADBD3] lg:block" />
      <p className="pf-eyebrow mb-2 hidden px-2 lg:block">Developer</p>
      {SETTINGS_NAVIGATION.filter((item) => item.group === "developer").map(
        ({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-[7px] px-3 text-[10px] text-[#71726D] lg:w-full",
              tab === id && "bg-white font-semibold text-[#232323] shadow-sm"
            )}
          >
            <Icon className={cn("size-3.5", tab === id && "text-[#FF4A20]")} />
            {label}
          </button>
        )
      )}
    </aside>
  );
}

const DEFAULT_SETTINGS: SettingsRecord = {
  id: "workspace-settings",
  workspaceName: "PostForge Studio",
  timezone: "America/Toronto",
  approvalDefault: true,
  emailFailures: true,
  emailApprovals: false,
  updatedAt: new Date(0).toISOString(),
};

const INTEGRATION_CALLBACK_KEYS = [
  "integration",
  "provider",
  "integration_status",
  "status",
  "connected",
  "integration_error",
  "error",
  "error_description",
  "message",
] as const;

export function readIntegrationCallbackFeedback(params: URLSearchParams): {
  tone: "success" | "error";
  message: string;
  provider: SocialProvider | null;
} | null {
  const connectedValue = params.get("connected");
  const providerValue =
    params.get("provider") ??
    params.get("integration") ??
    (connectedValue && SOCIAL_PROVIDERS.includes(connectedValue as SocialProvider)
      ? connectedValue
      : null);
  const provider = SOCIAL_PROVIDERS.includes(providerValue as SocialProvider)
    ? (providerValue as SocialProvider)
    : null;
  const displayName = provider
    ? provider === "youtube"
      ? "YouTube"
      : provider === "tiktok"
        ? "TikTok"
        : "Instagram"
    : "Social account";
  const failure =
    params.get("integration_error") ??
    params.get("error_description") ??
    params.get("error");
  if (failure) {
    const failureMessages: Record<string, string> = {
      oauth_denied: "authorization was denied",
      state_invalid: "the OAuth security check expired or was invalid",
      exchange_failed: "the provider token exchange failed",
      not_configured: "the server integration is not configured",
      publication_unresolved:
        "the new authorization would strand a pending publication; reconnect the same account with publishing permission or finish the publication first",
    };
    return {
      tone: "error",
      message: `${displayName} connection failed: ${failureMessages[failure] ?? "an unknown connection error occurred"}`,
      provider,
    };
  }

  const outcome = (
    params.get("integration_status") ??
    params.get("status") ??
    connectedValue ??
    ""
  ).toLowerCase();
  if (
    provider &&
    (["1", "connected", "success", "complete", "true"].includes(outcome) ||
      provider === connectedValue)
  ) {
    return {
      tone: "success",
      message: `${displayName} authorization returned. Confirming the server connection.`,
      provider,
    };
  }
  if (["error", "failed", "denied", "cancelled"].includes(outcome)) {
    return {
      tone: "error",
      message: `${displayName} connection was not completed.`,
      provider,
    };
  }
  return null;
}

function removeIntegrationCallbackParams(params: URLSearchParams) {
  for (const key of INTEGRATION_CALLBACK_KEYS) params.delete(key);
}

export function SettingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") ?? "integrations";
  const [tab, setTab] = useState<SettingsTab>(
    isSettingsTab(requested) ? requested : "integrations"
  );
  const [settings, setSettings] = useState<SettingsRecord>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [providers, setProviders] = useState<PublicIntegrationStatus[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const handledCallbackRef = useRef<string | null>(null);

  useEffect(() => {
    setTab(isSettingsTab(requested) ? requested : "integrations");
  }, [requested]);

  const refreshIntegrations = useCallback(async (announce = false) => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const response = await fetchIntegrations();
      setProviders(response.providers);
      if (announce) {
        setToast("Connection status refreshed");
        window.setTimeout(() => setToast(null), 1700);
      }
      return response.providers;
    } catch (cause) {
      setIntegrationsError(
        cause instanceof Error ? cause.message : "Unable to load integration status"
      );
      return null;
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<SettingsRecord>("connections")
      .then(({ records }) => {
        const saved = records.find((record) => record.id === "workspace-settings");
        if (!cancelled && saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load settings"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const feedback = readIntegrationCallbackFeedback(params);
    if (!feedback) return;
    const callbackKey = searchParams.toString();
    if (handledCallbackRef.current === callbackKey) return;
    handledCallbackRef.current = callbackKey;

    setTab("integrations");
    removeIntegrationCallbackParams(params);
    params.set("tab", "integrations");
    router.replace(`/settings?${params.toString()}`, { scroll: false });

    if (feedback.tone === "error") {
      setError(feedback.message);
      return;
    }

    void refreshIntegrations().then((nextProviders) => {
      const confirmed = nextProviders?.find(
        (candidate) =>
          candidate.provider === feedback.provider &&
          candidate.connected &&
          candidate.accounts.length > 0
      );
      if (!confirmed) {
        setError(
          `${feedback.provider === "youtube" ? "YouTube" : feedback.provider === "tiktok" ? "TikTok" : "Instagram"} authorization returned, but the server did not confirm a connected account.`
        );
        return;
      }
      const account = confirmed.accounts[confirmed.accounts.length - 1].account;
      const accountLabel =
        account?.displayName || account?.username || confirmed.displayName;
      setToast(`${confirmed.displayName} connected as ${accountLabel}.`);
      window.setTimeout(() => setToast(null), 2600);
    });
  }, [refreshIntegrations, router, searchParams]);

  function selectTab(next: SettingsTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = { ...settings, updatedAt: new Date().toISOString() };
      await saveWorkspaceFeature("connections", next);
      setSettings(next);
      notify("Settings saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function connectProvider(
    status: PublicIntegrationStatus,
    acceptPolicies = false
  ) {
    if (status.configuration !== "ready" || !status.connectUrl) {
      return;
    }
    if (status.provider !== "youtube") {
      window.location.assign(status.connectUrl);
      return;
    }
    setBusyProvider(status.provider);
    setIntegrationsError(null);
    try {
      const result = await beginIntegrationConnection(status.provider, {
        acceptPolicies,
      });
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      setIntegrationsError(
        cause instanceof Error
          ? cause.message
          : "Unable to start YouTube authorization"
      );
      setBusyProvider(null);
    }
  }

  async function syncProvider(
    status: PublicIntegrationStatus,
    accountId: string
  ) {
    setBusyProvider(status.provider);
    setIntegrationsError(null);
    try {
      const result = await syncIntegration(status.provider, accountId);
      await refreshIntegrations();
      notify(
        `${status.displayName} synced ${result.posts.length} owned post${result.posts.length === 1 ? "" : "s"}`
      );
    } catch (cause) {
      setIntegrationsError(
        cause instanceof Error ? cause.message : `Unable to sync ${status.displayName}`
      );
    } finally {
      setBusyProvider(null);
    }
  }

  async function disconnectProvider(
    status: PublicIntegrationStatus,
    accountId: string
  ) {
    const bound =
      status.accounts.find((candidate) => candidate.account.id === accountId) ??
      null;
    const accountName =
      bound?.account.displayName ||
      bound?.account.username ||
      status.displayName;
    if (
      !window.confirm(
        `Disconnect ${accountName} from ${status.displayName}? Provider-owned metrics will stop refreshing. Imported CSV data will not be removed. Disconnect is blocked while a publication is pending or processing.`
      )
    ) {
      return;
    }

    setBusyProvider(status.provider);
    setIntegrationsError(null);
    try {
      await disconnectIntegration(status.provider, accountId);
      await refreshIntegrations();
      notify(`${accountName} disconnected from ${status.displayName}`);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : `Unable to disconnect ${accountName}`;
      if (/provider revocation failed/i.test(message)) {
        const confirmation = window.prompt(
          `${status.displayName} did not confirm remote revocation. To permanently delete the local connection, encrypted tokens, and cached metrics anyway, type ${LOCAL_INTEGRATION_DELETE_CONFIRMATION}. You must separately revoke PostForge in ${status.displayName}'s account permissions.`
        );
        if (confirmation === LOCAL_INTEGRATION_DELETE_CONFIRMATION) {
          try {
            await disconnectIntegration(status.provider, accountId, {
              forceLocalDelete: true,
              confirmation,
            });
            await refreshIntegrations();
            notify(
              `${status.displayName} local data deleted; remote revocation was not confirmed`
            );
            return;
          } catch (forceDeleteCause) {
            setIntegrationsError(
              forceDeleteCause instanceof Error
                ? forceDeleteCause.message
                : `Unable to delete local ${status.displayName} data`
            );
            return;
          }
        }
        setIntegrationsError(
          confirmation === null
            ? message
            : `Local ${status.displayName} data was not deleted because the confirmation phrase did not match. Remote access remains unconfirmed; use the provider permission link below.`
        );
        return;
      }
      setIntegrationsError(message);
    } finally {
      setBusyProvider(null);
    }
  }

  if (loading) return <div className="grid min-h-[540px] place-items-center"><Loader2 className="size-6 animate-spin text-[#FF4A20]" /></div>;

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

      <main className="min-w-0 px-5 py-6 sm:px-7 lg:px-8">
        {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2 text-[10px] text-[#B83F2D]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error"><X className="size-3.5" /></button></div>}
        {tab === "integrations" ? <IntegrationsPanel providers={providers} loading={integrationsLoading} error={integrationsError} busyProvider={busyProvider} onRefresh={() => refreshIntegrations(true)} onConnect={connectProvider} onSync={syncProvider} onDisconnect={disconnectProvider} onOpenWebhooks={() => selectTab("webhooks")} /> : tab === "billing" ? <Billing /> : tab === "team" ? <Team /> : tab === "models" ? <ModelsPanel /> : tab === "api-keys" ? <ProviderCredentialsPanel /> : tab === "webhooks" ? <DeveloperSettingsPanel tab="webhooks" /> : <SettingsForm tab={tab} settings={settings} setSettings={setSettings} saving={saving} onSave={save} />}
      </main>

      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[90] flex min-w-0 items-center gap-2 rounded-[9px] bg-[#232323] px-3 py-2.5 text-[10px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[#69D583]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}

const PROVIDER_CONTENT: Record<
  SocialProvider,
  {
    description: string;
    setup: string;
    documentation: string;
    policyLinks?: Array<{ label: string; href: string }>;
  }
> = {
  tiktok: {
    description: "Read owned-post performance and explicitly publish an approved Gallery video after provider review.",
    setup: "Set server credentials and a public HTTPS POSTFORGE_PUBLIC_URL. Verify that domain or URL prefix in TikTok's developer portal and obtain video.publish approval; OAuth configuration alone is not sufficient.",
    documentation: "https://developers.tiktok.com/doc/login-kit-overview",
  },
  instagram: {
    description: "Read owned Reels and explicitly publish an approved Gallery video after provider review.",
    setup: "Set server credentials, a public HTTPS POSTFORGE_PUBLIC_URL reachable by Meta's crawler, and grant instagram_business_content_publish.",
    documentation: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login",
  },
  youtube: {
    description: "Read channel-owned metrics and explicitly upload an approved vertical video with editable metadata and privacy.",
    setup: "Publish your own Privacy Policy, Terms, and data-deletion instructions at public HTTPS URLs; set POSTFORGE_PRIVACY_POLICY_URL, POSTFORGE_TERMS_URL, POSTFORGE_DATA_DELETION_URL, and a strong CRON_SECRET for the daily provider-data retention job; configure the same disclosures on the Google OAuth consent screen; enable the YouTube Data API; grant youtube.upload; and complete any required Google verification. PostForge validates URL and retention-worker readiness only: it does not create legal disclosures, attest their contents, or claim provider approval.",
    documentation: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    policyLinks: [
      {
        label: "YouTube Terms",
        href: "https://www.youtube.com/t/terms",
      },
      {
        label: "YouTube Community Guidelines",
        href: "https://www.youtube.com/howyoutubeworks/policies/community-guidelines/",
      },
      {
        label: "YouTube API Services Terms",
        href: "https://developers.google.com/youtube/terms/api-services-terms-of-service",
      },
      {
        label: "Google Privacy Policy",
        href: "https://policies.google.com/privacy",
      },
      {
        label: "Revoke Google access",
        href: "https://myaccount.google.com/permissions",
      },
    ],
  },
};

export function IntegrationsPanel({
  providers,
  loading,
  error,
  busyProvider,
  onRefresh,
  onConnect,
  onSync,
  onDisconnect,
  onOpenWebhooks,
}: {
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
}) {
  const connectedCount = providers.reduce(
    (sum, provider) => sum + provider.accounts.length,
    0
  );
  return (
    <>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <p className="pf-eyebrow">Connections</p>
          <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.035em]">Integrations</h2>
          <p className="mt-1 text-[10px] text-[#858681]">Connect every account you publish or measure. Each account keeps its own scope and sync state.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="pf-button-secondary shrink-0">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh status
        </button>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] border border-[#BED3EF] bg-[#F4F8FE] p-3">
        <span className="grid size-7 place-items-center rounded-full bg-[#378EFF] text-[10px] text-white">i</span>
        <div className="min-w-0">
          <b className="block text-[11px]">Connections are server-owned</b>
          <p className="mt-1 text-[10px] leading-3 text-[#6F7D8F]">PostForge only reports an account as connected after OAuth and server-side token storage succeed. Multiple accounts per platform are supported.</p>
        </div>
        <ShieldCheck className="size-4 text-[#378EFF]" />
      </div>

      {error && (
        <div role="alert" className="mt-4 flex flex-col items-start justify-between gap-3 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-3 text-[10px] text-[#B83F2D] sm:flex-row sm:items-center">
          <span className="flex min-w-0 items-start gap-2 break-words [overflow-wrap:anywhere]"><AlertCircle className="size-4 shrink-0" />{error}</span>
          <button type="button" onClick={onRefresh} className="rounded-[6px] border border-[#E3A99E] bg-white px-2.5 py-1.5 text-[10px] font-semibold">Try again</button>
        </div>
      )}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">Social accounts</h3>
          <p className="mt-1 text-[10px] text-[#858681]">Multiple accounts per platform share the same server-owned connection state in Performance and Automations.</p>
        </div>
        <span className="shrink-0 text-[10px] text-[#999A95]">{connectedCount} connected</span>
      </div>
      <div className="mt-3 grid gap-3" aria-busy={loading}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <SocialIntegrationCard
            key={provider}
            provider={provider}
            status={providers.find((candidate) => candidate.provider === provider) ?? null}
            loading={loading}
            busy={busyProvider === provider}
            onConnect={onConnect}
            onSync={onSync}
            onDisconnect={onDisconnect}
          />
        ))}
      </div>

      <SectionHeading title="Asset sources" description="Move visual assets into Collections without downloading first." />
      <div className="grid gap-2 xl:grid-cols-2"><ServiceRow icon={<BrandAsset src="/brands/google-drive.svg" label="Google Drive" />} name="Google Drive" description="Import files and folders into image collections." action="Not configured" /><ServiceRow icon={<BrandAsset src="/brands/dropbox.svg" label="Dropbox" />} name="Dropbox" description="Choose a folder to watch for new creative assets." action="Not configured" /></div>
      <SectionHeading title="Automation handoffs" description="Send review events to tools your team already uses." />
      <div className="grid gap-2 xl:grid-cols-2"><ServiceRow icon={<MessageSquare className="size-4" />} name="Slack" description="Send approval requests and failure alerts to a channel." action="Not configured" /><ServiceRow icon={<Webhook className="size-4" />} name="Custom webhook" description="POST signed job and review events to your endpoint." action="Configure" onAction={onOpenWebhooks} /></div>
    </>
  );
}

export function SocialIntegrationCard({
  provider,
  status,
  loading,
  busy,
  onConnect,
  onSync,
  onDisconnect,
}: {
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
}) {
  const [youtubePolicyConsent, setYouTubePolicyConsent] = useState(false);
  const content = PROVIDER_CONTENT[provider];
  const displayName = status?.displayName ?? provider[0].toUpperCase() + provider.slice(1);
  const notConfigured = status?.configuration === "not_configured";
  const connected = Boolean(status?.connected && status.accounts.length > 0);
  const unavailable = !loading && !status;
  const youtubeCompliance = status?.youtubeCompliance;
  const youtubeOAuthNeedsConsent =
    provider === "youtube" &&
    status?.configuration === "ready" &&
    (!connected || status.accounts.some((account) => account.authorization.status !== "healthy"));
  const canStartOAuth =
    provider !== "youtube" ||
    (Boolean(youtubeCompliance) && youtubePolicyConsent);

  return (
    <article data-social-provider={provider} className="pf-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SocialProviderIcon provider={provider} label={`${displayName} logo`} className="size-9 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold">{displayName}</h3>
            <p className="mt-0.5 text-[10px] text-[#858681]">{status?.connected ? `${status.accounts.length} connected` : "No account connected"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && !status ? (
            <span className="h-5 w-20 animate-pulse rounded-full bg-[#ECEDE7]" />
          ) : (
            <span className={cn("rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em]", unavailable ? "border-[#F0B5AA] bg-[#FFF2EF] text-[#B83F2D]" : connected ? "border-[#B9DFC3] bg-[#EEF8F0] text-[#268B42]" : "border-[#D7D8D0] bg-[#F0F1EB] text-[#777873]")}>
              {unavailable ? "Status unavailable" : connected ? "Connected" : notConfigured ? "Not configured" : "Ready to connect"}
            </span>
          )}
          {status?.configuration === "ready" && !loading && status.connected && (
            <button type="button" onClick={() => onConnect(status, youtubePolicyConsent)} disabled={busy || !canStartOAuth} className="pf-button-secondary h-8 px-2.5 text-[10px]" title={`Connect another ${displayName} account`}>
              <Plug className="size-3" /> Connect another
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 max-w-[560px] text-[10px] leading-4 text-[#858681]">{content.description}</p>

      {status?.connected && status.accounts.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {status.accounts.map((account) => (
            <AccountRow
              key={account.account.id}
              providerStatus={status}
              displayName={displayName}
              account={account}
              busy={busy}
              onSync={onSync}
              onDisconnect={onDisconnect}
              onReconnect={() =>
                onConnect(
                  {
                    ...status,
                    connected: false,
                    accounts: [],
                    accountCount: 0,
                  },
                  youtubePolicyConsent
                )
              }
              canStartOAuth={canStartOAuth}
            />
          ))}
        </div>
      ) : notConfigured ? (
        <div className="mt-3 rounded-[8px] border border-dashed border-[#D4D5CE] bg-[#FAFAF8] p-2.5">
          <b className="block text-[10px] text-[#61625E]">Server setup required</b>
          <p className="mt-1 min-w-0 break-words text-[9px] leading-3.5 text-[#858681] [overflow-wrap:anywhere]">{content.setup}</p>
          <Link href={content.documentation} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[#378EFF]">Setup documentation <ExternalLink className="size-2.5" /></Link>
          {content.policyLinks && (
            <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
              {content.policyLinks.map((link) => (
                <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[9px] font-semibold text-[#378EFF] [overflow-wrap:anywhere]">
                  {link.label} <ExternalLink className="size-2.5 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : unavailable ? (
        <p className="mt-3 min-w-0 break-words rounded-[8px] border border-dashed border-[#E1B7AF] bg-[#FFF8F6] p-2.5 text-[9px] leading-3.5 text-[#9B5043] [overflow-wrap:anywhere]">The integration service did not return this provider. Refresh status before attempting a connection.</p>
      ) : (
        <p className="mt-3 rounded-[8px] border border-dashed border-[#D4D5CE] bg-[#FAFAF8] p-2.5 text-[9px] leading-3.5 text-[#858681]">OAuth is configured, but no account is connected to this workspace.</p>
      )}

      {content.policyLinks && !notConfigured && (
        <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          {content.policyLinks.map((link) => (
            <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[9px] font-semibold text-[#378EFF] [overflow-wrap:anywhere]">
              {link.label} <ExternalLink className="size-2.5 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {provider === "youtube" && youtubeCompliance && (
        <div data-youtube-owner-policies className="mt-3 rounded-[8px] border border-[#BED3EF] bg-[#F4F8FE] p-2.5">
          <b className="block text-[10px] text-[#364C68]">
            PostForge policies for YouTube API Services
          </b>
          <div className="mt-1.5 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {[
              ["Privacy Policy", youtubeCompliance.privacyPolicyUrl],
              ["Terms", youtubeCompliance.termsUrl],
              ["Data deletion", youtubeCompliance.dataDeletionUrl],
            ].map(([label, href]) => (
              <Link key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[9px] font-semibold text-[#246FC2] [overflow-wrap:anywhere]">
                {label} <ExternalLink className="size-2.5 shrink-0" />
              </Link>
            ))}
          </div>
          {youtubeOAuthNeedsConsent && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 border-t border-[#D6E3F2] pt-2 text-[9px] leading-3.5 text-[#52667D]">
              <input
                type="checkbox"
                aria-label="Accept policies before connecting YouTube"
                checked={youtubePolicyConsent}
                disabled={busy}
                onChange={(event) =>
                  setYouTubePolicyConsent(event.currentTarget.checked)
                }
                className="mt-0.5 size-3 shrink-0 accent-[#232323]"
              />
              <span>
                I have reviewed and accept PostForge&apos;s Privacy Policy and
                Terms. I also agree that using YouTube API Services means
                accepting YouTube&apos;s Terms of Service.
              </span>
            </label>
          )}
        </div>
      )}

      {!status?.connected && (
        <div className="mt-3 flex">
          <button type="button" onClick={() => status && onConnect(status, youtubePolicyConsent)} disabled={!status || status.configuration !== "ready" || !status.connectUrl || loading || busy || !canStartOAuth} className={cn("h-9 w-full rounded-[8px] text-[11px] font-semibold", status?.configuration === "ready" && status.connectUrl && canStartOAuth ? "bg-[#232323] text-white hover:bg-black" : "cursor-not-allowed bg-[#E5E6DF] text-[#999A95]")}>
            {loading && !status ? "Checking configuration…" : notConfigured ? "Setup required" : unavailable ? "Status unavailable" : status?.connectUrl ? `Connect ${displayName}` : "Connect endpoint unavailable"}
          </button>
        </div>
      )}
    </article>
  );
}

function AccountRow({
  providerStatus,
  displayName,
  account,
  busy,
  onSync,
  onDisconnect,
  onReconnect,
  canStartOAuth,
}: {
  providerStatus: PublicIntegrationStatus;
  displayName: string;
  account: ConnectedIntegrationAccountStatus;
  busy: boolean;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
  onReconnect: () => void;
  canStartOAuth: boolean;
}) {
  const { account: info } = account;
  const accountName = info.displayName || info.username || `${displayName} account`;
  const accountUsername = info.username
    ? info.username.startsWith("@")
      ? info.username
      : `@${info.username}`
    : "Username unavailable";
  const authorizationRequired = account.authorization.status !== "healthy";
  const syncTone = authorizationRequired || account.sync.status === "error"
    ? "border-[#F0B5AA] bg-[#FFF2EF] text-[#B83F2D]"
    : account.sync.status === "partial"
      ? "border-[#E7C990] bg-[#FFFAEC] text-[#806126]"
      : account.sync.status === "ready"
        ? "border-[#B9DFC3] bg-[#EEF8F0] text-[#268B42]"
        : "border-[#D7D8D0] bg-[#F0F1EB] text-[#777873]";
  const syncLabel = authorizationRequired
    ? "Reconnect required"
    : account.sync.status === "error"
      ? "Sync error"
      : account.sync.status === "partial"
        ? "Partially synced"
        : account.sync.status === "ready"
          ? "Ready"
          : "Not synced";
  return (
    <div className="grid min-w-0 gap-2 rounded-[10px] border border-[#E0E1DA] bg-[#FAFAF8] p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#232323] text-[10px] font-bold text-white">
          {accountName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[11px]">{accountName}</b>
          <small className="mt-0.5 block truncate text-[9px] text-[#858681]">{accountUsername}</small>
        </span>
        {info.profileUrl && <Link href={info.profileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${displayName} profile`} className="grid size-7 shrink-0 place-items-center rounded-[7px] border border-[#DADBD2] bg-white"><ExternalLink className="size-3" /></Link>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap gap-1">
          {(["metrics", "publish"] as const).map((capability) => (
            <span key={capability} className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", account.capabilities[capability] ? "border-[#C8DDCE] bg-[#F0F8F2] text-[#347646]" : "border-[#DEDFD8] bg-white text-[#999A95]")}>
              {capability === "metrics" ? "Metrics" : account.publishingUnavailableReason ? "Upload runtime" : "Upload scope"} {account.capabilities[capability] ? "verified" : capability === "publish" && account.publishingUnavailableReason ? "unavailable" : "not granted"}
            </span>
          ))}
        </div>
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", syncTone)}>{syncLabel}</span>
        {authorizationRequired && <span className="rounded-full border border-[#F0B5AA] bg-[#FFF2EF] px-1.5 py-0.5 text-[9px] font-semibold text-[#B83F2D]">Authorization required</span>}
      </div>
      {account.sync.status === "ready" && account.sync.lastSuccessfulAt && (
        <p className="min-w-0 break-words text-[9px] leading-3.5 text-[#777873] [overflow-wrap:anywhere] lg:col-span-2">
          Last synced <time dateTime={account.sync.lastSuccessfulAt}>{formatConnectionDate(account.sync.lastSuccessfulAt)}</time>
        </p>
      )}
      {account.publishingUnavailableReason && (
        <p className="min-w-0 break-words text-[9px] leading-3.5 text-[#9B5043] [overflow-wrap:anywhere] lg:col-span-2">{account.publishingUnavailableReason}</p>
      )}
      {account.sync.status === "error" && account.sync.warnings[0] && (
        <p className="min-w-0 break-words text-[9px] leading-3.5 text-[#B83F2D] [overflow-wrap:anywhere] lg:col-span-2">{account.sync.warnings[0]}</p>
      )}
      <div className="flex flex-wrap gap-1.5 lg:col-span-2">
        <button type="button" onClick={() => authorizationRequired ? onReconnect() : onSync(providerStatus, account.account.id)} disabled={busy || (authorizationRequired && !canStartOAuth)} className="pf-button-secondary h-7 px-2.5 text-[10px]">
          {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} {authorizationRequired ? "Reconnect" : "Sync"}
        </button>
        <button type="button" onClick={() => onDisconnect(providerStatus, account.account.id)} disabled={busy} className="pf-button-secondary h-7 px-2.5 text-[10px] text-[#B83F2D]">
          <Unplug className="size-3" /> Disconnect
        </button>
      </div>
    </div>
  );
}

function formatConnectionDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "at an unknown time";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ModelsCatalogResponse = {
  models: Array<{
    id: string;
    name: string;
    type: "image" | "video";
    pricing: { unit: string; amount: number };
    capabilities: Record<string, unknown>;
    defaults: Record<string, unknown>;
  }>;
  defaults: { image: string; video: string };
  availability: {
    enabledModelIds: string[];
    defaultImageModelId: string | null;
    defaultVideoModelId: string | null;
  } | null;
};

function ModelsPanel() {
  const [catalog, setCatalog] = useState<ModelsCatalogResponse | null>(null);
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>([]);
  const [defaultImageModelId, setDefaultImageModelId] = useState("");
  const [defaultVideoModelId, setDefaultVideoModelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) throw new Error("Model catalog could not be loaded.");
        const data = (await response.json()) as ModelsCatalogResponse;
        if (cancelled) return;
        setCatalog(data);
        setEnabledModelIds(
          data.availability?.enabledModelIds ??
            data.models.map((model) => model.id)
        );
        setDefaultImageModelId(
          data.availability?.defaultImageModelId ?? data.defaults.image
        );
        setDefaultVideoModelId(
          data.availability?.defaultVideoModelId ?? data.defaults.video
        );
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Model catalog could not be loaded."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const imageModels = catalog?.models.filter((model) => model.type === "image") ?? [];
  const videoModels = catalog?.models.filter((model) => model.type === "video") ?? [];

  const toggleModel = (modelId: string) => {
    setEnabledModelIds((current) => {
      const next = current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId];
      if (!next.includes(defaultImageModelId)) setDefaultImageModelId("");
      if (!next.includes(defaultVideoModelId)) setDefaultVideoModelId("");
      return next;
    });
  };

  const handleSave = async () => {
    if (!catalog) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const nextImageDefault =
        defaultImageModelId && enabledModelIds.includes(defaultImageModelId)
          ? defaultImageModelId
          : null;
      const nextVideoDefault =
        defaultVideoModelId && enabledModelIds.includes(defaultVideoModelId)
          ? defaultVideoModelId
          : null;
      const response = await fetch("/api/settings/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: {
            enabledModelIds,
            defaultImageModelId: nextImageDefault,
            defaultVideoModelId: nextVideoDefault,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Model availability could not be saved.");
      }
      setNotice("Model availability saved. Picker defaults now follow these settings.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Model availability could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const modelRows = (models: ModelsCatalogResponse["models"]) =>
    models.map((model) => {
      const enabled = enabledModelIds.includes(model.id);
      const isDefault =
        model.type === "image"
          ? defaultImageModelId === model.id
          : defaultVideoModelId === model.id;
      return (
        <label
          key={model.id}
          data-model-availability-row={model.id}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[9px] border px-3 py-2.5 transition-colors",
            enabled ? "border-[#D7D8D0] bg-white" : "border-[#E5E6DF] bg-[#FAFAF8] opacity-60"
          )}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => toggleModel(model.id)}
            aria-label={`Enable ${model.name}`}
            className="size-4 shrink-0 accent-[#FF4A20]"
          />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[11px] text-[#30312E]">{model.name}</b>
            <small className="mt-0.5 block truncate text-[10px] text-[#92938E]">
              {model.pricing.unit === "per_image"
                ? `$${model.pricing.amount.toFixed(3)}/image`
                : model.pricing.unit === "per_clip"
                  ? `$${model.pricing.amount.toFixed(2)}/clip`
                  : `$${model.pricing.amount.toFixed(3)}/second`}
            </small>
          </span>
          {isDefault && (
            <span className="rounded-full bg-[#EEF5FF] px-2 py-1 text-[9px] font-bold text-[#2A71C7]">
              DEFAULT
            </span>
          )}
        </label>
      );
    });

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#FF4A20]" />
      </div>
    );
  }

  return (
    <div data-settings-models-panel>
      <span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]">
        <Settings2 className="size-4" />
      </span>
      <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">Available models</h2>
      <p className="mt-1 max-w-[620px] text-[11px] leading-4 text-[#858681]">
        One central catalog powers the Generate, Clone, Slideshow, and automation surfaces. Disabled models disappear from every picker; the default model is used when a surface does not expose a picker.
      </p>

      {error && (
        <div role="alert" className="mt-4 flex min-w-0 items-start gap-2 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2.5 text-[10px] leading-4 text-[#B83F2D]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 flex min-w-0 items-start gap-2 rounded-[9px] border border-[#BED3EF] bg-[#F4F8FE] px-3 py-2.5 text-[10px] leading-4 text-[#2A71C7]">
          <Check className="mt-0.5 size-3.5 shrink-0" /> {notice}
        </div>
      )}

      <div className="pf-card mt-6 max-w-[760px] space-y-5 p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[11px] font-semibold">Image models</h3>
              <p className="mt-1 text-[10px] text-[#92938E]">
                {imageModels.length} in catalog · {imageModels.filter((m) => enabledModelIds.includes(m.id)).length} enabled
              </p>
            </div>
            <select
              aria-label="Default image model"
              value={defaultImageModelId}
              onChange={(event) => setDefaultImageModelId(event.target.value)}
              className="h-9 max-w-[220px] rounded-[7px] border border-[#D7D8D0] bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
            >
              <option value="">No default</option>
              {imageModels
                .filter((model) => enabledModelIds.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{modelRows(imageModels)}</div>
        </div>

        <div className="border-t border-[#E3E4DD] pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[11px] font-semibold">Video models</h3>
              <p className="mt-1 text-[10px] text-[#92938E]">
                {videoModels.length} in catalog · {videoModels.filter((m) => enabledModelIds.includes(m.id)).length} enabled
              </p>
            </div>
            <select
              aria-label="Default video model"
              value={defaultVideoModelId}
              onChange={(event) => setDefaultVideoModelId(event.target.value)}
              className="h-9 max-w-[220px] rounded-[7px] border border-[#D7D8D0] bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
            >
              <option value="">No default</option>
              {videoModels
                .filter((model) => enabledModelIds.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{modelRows(videoModels)}</div>
        </div>

        <div className="flex justify-end border-t border-[#E3E4DD] pt-4">
          <button onClick={() => void handleSave()} disabled={saving} className="pf-button-primary">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save model settings
          </button>
        </div>
      </div>
    </div>
  );
}

type ProviderCredentialStatus = {
  provider: "fal" | "gemini" | "virlo";
  configured: boolean;
  source: "stored" | "env" | "none";
  envKey: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  fal: "fal.ai",
  gemini: "Google Gemini",
  virlo: "Virlo",
};

function ProviderCredentialsPanel() {
  const [statuses, setStatuses] = useState<ProviderCredentialStatus[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/provider-credentials");
      if (!response.ok) throw new Error("Credential status could not be loaded.");
      const data = (await response.json()) as { providers: ProviderCredentialStatus[] };
      setStatuses(data.providers);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Credential status could not be loaded."
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async (provider: string) => {
    const value = values[provider] ?? "";
    if (!value.trim()) {
      setError("Enter a key before saving.");
      return;
    }
    setBusy(provider);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/settings/provider-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, value }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "The provider key could not be saved.");
      }
      setValues((current) => ({ ...current, [provider]: "" }));
      await refresh();
      setNotice(`${PROVIDER_LABELS[provider] ?? provider} key saved server-side.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The provider key could not be saved."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async (provider: string) => {
    setBusy(provider);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/settings/provider-credentials?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "The provider key could not be cleared.");
      }
      await refresh();
      setNotice(`${PROVIDER_LABELS[provider] ?? provider} key cleared.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The provider key could not be cleared."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-provider-credentials-panel>
      <span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]">
        <KeyRound className="size-4" />
      </span>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="pf-eyebrow">Developer</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.035em]">API keys</h2>
          <p className="mt-1 max-w-[620px] text-[11px] leading-4 text-[#858681]">
            Manage the provider credentials this workspace uses for generation. Keys are encrypted at rest on the server and are never sent back to this browser.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex min-w-0 items-start gap-2 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2.5 text-[10px] leading-4 text-[#B83F2D]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 flex min-w-0 items-start gap-2 rounded-[9px] border border-[#BED3EF] bg-[#F4F8FE] px-3 py-2.5 text-[10px] leading-4 text-[#2A71C7]">
          <Check className="mt-0.5 size-3.5 shrink-0" /> {notice}
        </div>
      )}

      <div className="mt-6 max-w-[760px] space-y-3">
        {!statuses && (
          <div className="pf-card grid min-h-[200px] place-items-center p-5">
            <Loader2 className="size-5 animate-spin text-[#FF4A20]" />
          </div>
        )}
        {(statuses ?? []).map((status) => {
          const tone =
            status.source === "stored"
              ? "border-[#B9DFC3] bg-[#EEF8F0] text-[#268B42]"
              : status.source === "env"
                ? "border-[#BED3EF] bg-[#F4F8FE] text-[#2A71C7]"
                : "border-[#D7D8D0] bg-[#F0F1EB] text-[#777873]";
          return (
            <article
              key={status.provider}
              data-provider-credential={status.provider}
              className="pf-card grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[11px] font-semibold">
                    {PROVIDER_LABELS[status.provider] ?? status.provider}
                  </h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.06em]", tone)}>
                    {status.source === "stored"
                      ? "Configured"
                      : status.source === "env"
                        ? "Env configured"
                        : "Not configured"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-3.5 text-[#92938E]">
                  Environment fallback: {status.envKey}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:max-w-[340px]">
                <div className="flex min-w-0 gap-2">
                  <input
                    type="password"
                    value={values[status.provider] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [status.provider]: event.target.value,
                      }))
                    }
                    placeholder={
                      status.configured ? "Rotate with a new key…" : `Paste ${PROVIDER_LABELS[status.provider]} key…`
                    }
                    className="h-9 min-w-0 flex-1 rounded-[7px] border border-[#D7D8D0] bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave(status.provider)}
                    disabled={busy !== null || !(values[status.provider] ?? "").trim()}
                    className="h-9 shrink-0 rounded-[7px] bg-[#232323] px-3 text-[10px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-[#E5E6DF] disabled:text-[#999A95]"
                  >
                    {busy === status.provider ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
                {status.source === "stored" && (
                  <button
                    type="button"
                    onClick={() => void handleClear(status.provider)}
                    disabled={busy !== null}
                    className="self-end text-[9px] font-semibold text-[#B83F2D] hover:underline disabled:opacity-50"
                  >
                    {busy === status.provider ? "Clearing…" : "Clear stored key"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function DeveloperSettingsPanel({ tab }: { tab: "api-keys" | "webhooks" }) {
  const isApiKeys = tab === "api-keys";
  const Icon = isApiKeys ? KeyRound : Webhook;

  return <div data-developer-settings-panel={tab}><span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]"><Icon className="size-4" /></span><div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><p className="pf-eyebrow">Developer</p><h2 className="mt-1 text-[22px] font-semibold tracking-[-0.035em]">{isApiKeys ? "API keys" : "Webhooks"}</h2><p className="mt-1 max-w-[620px] text-[11px] leading-4 text-[#858681]">{isApiKeys ? "Create scoped credentials only after server-side identity, hashing, revocation, and audit ownership exist." : "Deliver signed workflow events only after endpoint validation, secret storage, retries, and delivery logs exist."}</p></div><span className="rounded-full border border-[#D7D8D0] bg-[#F0F1EB] px-2.5 py-1 text-[10px] font-bold text-[#777873]">NOT CONFIGURED</span></div><div className="pf-card mt-6 max-w-[720px] p-5"><div className="rounded-[10px] border border-dashed border-[#CFCFC7] bg-[#FAFAF8] px-5 py-8 text-center"><Icon className="mx-auto size-6 text-[#999A95]" /><h3 className="mt-3 text-[11px] font-semibold">{isApiKeys ? "No API keys have been issued" : "No webhook endpoints are registered"}</h3><p className="mx-auto mt-2 max-w-[480px] text-[11px] leading-4 text-[#858681]">{isApiKeys ? "PostForge will not fabricate, reveal, or retain credentials in this browser. A server-owned key service must be configured before keys can be created." : "No events are being delivered. PostForge will not claim a webhook is active until a server-owned signing and retry pipeline is configured."}</p><button type="button" disabled className="mt-4 h-9 rounded-[8px] bg-[#E5E6DF] px-4 text-[11px] font-semibold text-[#999A95] disabled:cursor-not-allowed">{isApiKeys ? "API key service not configured" : "Webhook delivery not configured"}</button></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{(isApiKeys ? [["Scoped access", "Per-key permissions and expiry"], ["Secure storage", "Hashed secrets, never plaintext"], ["Audit trail", "Creation, use, and revocation logs"]] : [["Signed events", "Server-owned signing secret"], ["Reliable delivery", "Retries and failure handling"], ["Delivery history", "Status and response audit log"]]).map(([title, detail]) => <div key={title} className="rounded-[8px] border border-[#E1E2DB] bg-[#FAFAF8] p-3"><b className="block text-[11px]">{title}</b><span className="mt-1 block text-[10px] leading-3 text-[#92938E]">{detail}</span></div>)}</div></div></div>;
}

function SettingsForm({ tab, settings, setSettings, saving, onSave }: { tab: string; settings: SettingsRecord; setSettings: React.Dispatch<React.SetStateAction<SettingsRecord>>; saving: boolean; onSave: () => void }) {
  const info = tab === "profile" ? ["Profile", "Workspace identity and timezone.", UserRound] as const : tab === "publishing" ? ["Publishing defaults", "Set safe defaults for new automations.", Settings2] as const : ["Notifications", "Choose which live workspace events appear in the navigation rail.", Bell] as const;
  const Icon = info[2];
  return <div><span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]"><Icon className="size-4" /></span><h2 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">{info[0]}</h2><p className="mt-1 text-[11px] text-[#858681]">{info[1]}</p><div className="pf-card mt-6 max-w-[620px] space-y-5 p-5">{tab === "profile" && <><Field label="Workspace name"><input value={settings.workspaceName} onChange={(event) => setSettings((current) => ({ ...current, workspaceName: event.target.value }))} /></Field><Field label="Default timezone"><select value={settings.timezone} onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))}><option>America/Toronto</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Europe/London</option></select></Field></>}{tab === "publishing" && <Toggle label="Require approval by default" detail="New automations begin with a human review gate" checked={settings.approvalDefault} onChange={(checked) => setSettings((current) => ({ ...current, approvalDefault: checked }))} />}{tab === "notifications" && <><Toggle label="Generation failures" detail="Show failed generation counts in the workspace navigation" checked={settings.emailFailures} onChange={(checked) => setSettings((current) => ({ ...current, emailFailures: checked }))} /><Toggle label="Approval requests" detail="Show outputs awaiting review in the workspace navigation" checked={settings.emailApprovals} onChange={(checked) => setSettings((current) => ({ ...current, emailApprovals: checked }))} /></>}<div className="flex justify-end border-t border-[#E3E4DD] pt-4"><button onClick={onSave} disabled={saving} className="pf-button-primary">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save changes</button></div></div></div>;
}

function Billing() {
  return <div><span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]"><CircleDollarSign className="size-4" /></span><h2 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">Billing & usage</h2><p className="mt-1 text-[11px] text-[#858681]">This self-hosted workspace tracks provider spend rather than charging a PostForge subscription.</p><div className="mt-6 grid max-w-[720px] gap-3 sm:grid-cols-2"><div className="pf-card p-4"><p className="pf-eyebrow">Plan</p><b className="mt-2 block text-lg">Self-hosted</b><p className="mt-1 text-[11px] text-[#858681]">No PostForge subscription configured.</p></div><div className="pf-card p-4"><p className="pf-eyebrow">Provider costs</p><b className="mt-2 block text-lg">Tracked live</b><Link href="/costs" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#378EFF]">Open Spend <ChevronRight className="size-3" /></Link></div></div></div>;
}

function Team() {
  return <div><span className="grid size-10 place-items-center rounded-[10px] bg-[#ECECE6] text-[#777]"><Users className="size-4" /></span><h2 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">Team</h2><p className="mt-1 text-[11px] text-[#858681]">PostForge is currently running as one local workspace.</p><div className="pf-card mt-6 max-w-[620px] p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#232323] text-[10px] font-bold text-white">PF</span><div><b className="block text-[10px]">Local administrator</b><p className="mt-1 text-[10px] text-[#858681]">Full access · local runtime</p></div><span className="ml-auto rounded-full bg-[#E7F5E9] px-2 py-1 text-[9px] font-bold text-[#268B42]">ACTIVE</span></div><div className="mt-5 rounded-[9px] border border-dashed border-[#CFCFC7] p-4 text-center"><Code2 className="mx-auto size-5 text-[#999]" /><p className="mt-2 text-[11px] text-[#777]">User accounts and workspace permissions need an authentication owner before invitations can be enabled.</p></div></div></div>;
}

function SectionHeading({ title, description }: { title: string; description: string }) { return <div className="mb-2 mt-6"><h3 className="text-[11px] font-semibold">{title}</h3><p className="mt-1 text-[10px] text-[#8A8B86]">{description}</p></div>; }
function BrandAsset({ src, label }: { src: string; label: string }) { return <Image src={src} alt={label} width={18} height={18} unoptimized className="size-[18px]" />; }
function ServiceRow({ icon, name, description, action, onAction }: { icon: React.ReactNode; name: string; description: string; action: string; onAction?: () => void }) { return <article className="pf-card grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto]"><span className="grid size-9 place-items-center rounded-[9px] bg-[#F0F1EB] text-[#555651]">{icon}</span><div className="min-w-0"><h3 className="truncate text-[10px] font-semibold">{name}</h3><p className="mt-1 break-words text-[10px] leading-3 text-[#888984]">{description}</p></div>{onAction ? <button type="button" onClick={onAction} className="col-span-2 w-full rounded-[6px] border border-[#D7D8D0] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#555651] hover:bg-[#F0F1EB] sm:col-span-1 sm:w-auto">{action}</button> : <span className="col-span-2 text-[10px] text-[#777] sm:col-span-1">{action}</span>}</article>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center"><span className="text-[11px] font-semibold text-[#666]">{label}</span><span className="min-w-0 [&_input]:h-9 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#D7D8D0] [&_input]:bg-[var(--pf-surface)] [&_input]:px-3 [&_input]:text-[11px] [&_input]:text-[var(--pf-ink)] [&_select]:h-9 [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#D7D8D0] [&_select]:bg-[var(--pf-surface)] [&_select]:px-3 [&_select]:text-[11px] [&_select]:text-[var(--pf-ink)]">{children}</span></label>; }
function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0"><b className="block text-[11px]">{label}</b><small className="mt-1 block break-words text-[10px] text-[#999]">{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 shrink-0 accent-[#FF4A20]" /></label>; }
