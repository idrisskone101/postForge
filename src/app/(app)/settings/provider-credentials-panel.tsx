"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Panel, Skeleton, StatusChip } from "@/components/workbench";

type ProviderCredentialStatus = {
  provider: "fal" | "gemini" | "virlo" | "ollama";
  configured: boolean;
  source: "stored" | "env" | "none";
  envKey: string;
};

export function ProviderCredentialsPanel({ onSaved }: { onSaved: (message: string) => void }) {
  const [statuses, setStatuses] = useState<ProviderCredentialStatus[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      onSaved(`${PROVIDER_LABELS[provider] ?? provider} key saved server-side.`);
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
      onSaved(`${PROVIDER_LABELS[provider] ?? provider} key cleared.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The provider key could not be cleared."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel pad="wide" title="API keys" data-provider-credentials-panel className="gap-2" aria-busy={!statuses}>
      {error && (
        <p role="alert" className="wb-notice my-1 break-words [overflow-wrap:anywhere]" data-tone="bad">
          {error}
        </p>
      )}
      <div className="flex flex-col">
        {!statuses &&
          !error &&
          [0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-4 border-t border-hairline py-[18px]">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-[42px] w-[280px] max-sm:hidden" />
            </div>
          ))}
        {(statuses ?? []).map((status) => {
          const label = PROVIDER_LABELS[status.provider] ?? status.provider;
          const value = values[status.provider] ?? "";
          const source = SOURCE[status.source];
          const inputId = `credential-${status.provider}`;
          return (
            <div
              key={status.provider}
              data-provider-credential={status.provider}
              className="flex flex-col gap-3 border-t border-hairline py-[18px] md:flex-row md:items-center md:gap-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={inputId} className="text-sm font-semibold leading-[18px] text-fg">
                    {label}
                  </label>
                  <StatusChip tone={source.tone}>{source.label}</StatusChip>
                </div>
                <span className="wb-mono text-fg-muted">Environment fallback {status.envKey}</span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:flex-nowrap">
                <input
                  id={inputId}
                  type="password"
                  autoComplete="off"
                  aria-label={`${label} API key`}
                  value={value}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [status.provider]: event.target.value }))
                  }
                  placeholder={status.configured ? "Rotate with a new key" : `Paste ${label} key`}
                  className="wb-input min-w-0 flex-1 basis-full md:w-[280px] md:flex-none md:basis-auto"
                />
                <Button
                  variant="strong"
                  onClick={() => void handleSave(status.provider)}
                  disabled={busy !== null || !value.trim()}
                >
                  {busy === status.provider ? "Saving" : "Save"}
                </Button>
                {status.source === "stored" && (
                  <Button variant="danger" onClick={() => void handleClear(status.provider)} disabled={busy !== null}>
                    {busy === status.provider ? "Clearing" : "Clear stored key"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  fal: "fal.ai",
  gemini: "Google Gemini",
  virlo: "Virlo",
  ollama: "Ollama",
};

const SOURCE: Record<
  ProviderCredentialStatus["source"],
  { tone: "ok" | "neutral"; label: string }
> = {
  stored: { tone: "ok", label: "Configured" },
  env: { tone: "ok", label: "Env configured" },
  none: { tone: "neutral", label: "Not configured" },
};
