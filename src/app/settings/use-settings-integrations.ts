"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  beginIntegrationConnection,
  disconnectIntegration,
  fetchIntegrations,
  LOCAL_INTEGRATION_DELETE_CONFIRMATION,
  syncIntegration,
  type PublicIntegrationStatus,
  type SocialProvider,
} from "@/lib/integrations-client";
import {
  readIntegrationCallbackFeedback,
  removeIntegrationCallbackParams,
} from "./integration-callback";

export function useSettingsIntegrations({
  onOAuthCallback,
  setError,
  setToast,
}: {
  onOAuthCallback: () => void;
  setError: (message: string) => void;
  setToast: (message: string | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<PublicIntegrationStatus[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const handledCallbackRef = useRef<string | null>(null);

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
  }, [setToast]);

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

    onOAuthCallback();
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
  }, [onOAuthCallback, refreshIntegrations, router, searchParams, setError, setToast]);

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
      setToast(
        `${status.displayName} synced ${result.posts.length} owned post${result.posts.length === 1 ? "" : "s"}`
      );
      window.setTimeout(() => setToast(null), 1700);
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
      setToast(`${accountName} disconnected from ${status.displayName}`);
      window.setTimeout(() => setToast(null), 1700);
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
            setToast(
              `${status.displayName} local data deleted; remote revocation was not confirmed`
            );
            window.setTimeout(() => setToast(null), 1700);
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

  return {
    providers,
    integrationsLoading,
    integrationsError,
    busyProvider,
    refreshIntegrations,
    connectProvider,
    syncProvider,
    disconnectProvider,
  };
}
