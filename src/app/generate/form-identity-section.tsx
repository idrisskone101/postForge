"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import { cn } from "@/lib/utils";

export function GenerateIdentitySection({
  show,
  isVideo,
  videoDescription,
  imageDescription,
  avatarId,
  identityStatus,
  identityError,
  onSelect,
}: {
  show: boolean;
  isVideo: boolean;
  videoDescription: string;
  imageDescription: string;
  avatarId: string | null;
  identityStatus: {
    label: string;
    tone: "ready" | "working" | "failed";
  };
  identityError: string | null;
  onSelect: (id: string) => void;
}) {
  if (!show) return undefined;

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Character identity
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            {isVideo ? videoDescription : imageDescription}
          </p>
        </div>
        {avatarId && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {avatarId && (
        <div
          role={identityStatus.tone === "failed" ? "alert" : "status"}
          className={cn(
            "mb-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-[12px] leading-4",
            identityStatus.tone === "ready" && "bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
            identityStatus.tone === "working" && "bg-[var(--pf-link)]/10 text-[var(--pf-link)]",
            identityStatus.tone === "failed" && "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
          )}
        >
          {identityStatus.tone === "ready" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : identityStatus.tone === "failed" ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
          )}
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {identityStatus.label}
          </span>
        </div>
      )}

      {identityError && (
        <div
          role="alert"
          className="mb-3 flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-danger)]"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {identityError}
          </span>
        </div>
      )}

      <AvatarPicker selectedId={avatarId} onSelect={onSelect} />
    </div>
  );
}
