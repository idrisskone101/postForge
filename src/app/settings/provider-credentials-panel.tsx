"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProviderCredentialStatus = {
  provider: "fal" | "gemini" | "virlo" | "ollama";
  configured: boolean;
  source: "stored" | "env" | "none";
  envKey: string;
};

export function ProviderCredentialsPanel() {
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
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <KeyRound className="size-4" />
      </span>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">API keys</h2>
          <p className="mt-1 max-w-[620px] text-[11px] leading-4 text-muted-foreground">
            Manage the provider credentials this workspace uses for generation. Keys are encrypted at rest on the server and are never sent back to this browser.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-danger)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-link)]">
          <Check className="mt-0.5 size-3.5 shrink-0" /> {notice}
        </div>
      )}

      <div className="mt-6 max-w-[760px] space-y-3">
        {!statuses && (
          <div className="pf-card grid min-h-[200px] place-items-center p-5">
            <Loader2 className="size-5 animate-spin text-[var(--pf-orange)]" />
          </div>
        )}
        {(statuses ?? []).map((status) => {
          const tone =
            status.source === "stored"
              ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
              : status.source === "env"
                ? "border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 text-[var(--pf-link)]"
                : "border-border bg-[var(--pf-active)] text-muted-foreground";
          return (
            <article
              key={status.provider}
              data-provider-credential={status.provider}
              className="pf-card grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-semibold">
                    {PROVIDER_LABELS[status.provider] ?? status.provider}
                  </h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.06em]", tone)}>
                    {status.source === "stored"
                      ? "Configured"
                      : status.source === "env"
                        ? "Env configured"
                        : "Not configured"}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                  Environment fallback: {status.envKey}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:max-w-[340px]">
                <div className="flex min-w-0 gap-2">
                  <input
                    type="password"
                    aria-label={`${PROVIDER_LABELS[status.provider] ?? status.provider} API key`}
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
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave(status.provider)}
                    disabled={busy !== null || !(values[status.provider] ?? "").trim()}
                    className="h-9 shrink-0 rounded-lg bg-foreground px-3 text-[12px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--pf-active)] disabled:text-muted-foreground"
                  >
                    {busy === status.provider ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
                {status.source === "stored" && (
                  <button
                    type="button"
                    onClick={() => void handleClear(status.provider)}
                    disabled={busy !== null}
                    className="self-end text-[11px] font-semibold text-[var(--pf-danger)] hover:underline disabled:opacity-50"
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


const PROVIDER_LABELS: Record<string, string> = {
  fal: "fal.ai",
  gemini: "Google Gemini",
  virlo: "Virlo",
  ollama: "Ollama",
};