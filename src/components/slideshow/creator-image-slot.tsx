"use client";

import { ImagePlus, X } from "lucide-react";

import { platformCollectionAssetUrl } from "@/lib/collections-client";
import { cn } from "@/lib/utils";

export function CreatorSlideImageSlot({
  assetId,
  label,
  onPick,
  onClear,
}: {
  assetId: string | null;
  label: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative mt-0.5 shrink-0">
      <button
        type="button"
        onClick={onPick}
        aria-label={
          assetId
            ? `Change ${label} image`
            : `Add ${label} image from collections`
        }
        className={cn(
          "relative size-10 overflow-hidden rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30",
          assetId
            ? "border-border bg-[#09090B]"
            : "border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-active)] text-muted-foreground hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)]",
        )}
      >
        {assetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={platformCollectionAssetUrl(assetId)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus className="mx-auto size-3.5" />
        )}
      </button>
      {assetId ? (
        <button
          type="button"
          aria-label={`Remove ${label} image`}
          onClick={onClear}
          className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30"
        >
          <X className="size-2.5" />
        </button>
      ) : null}
    </div>
  );
}
