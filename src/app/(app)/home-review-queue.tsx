"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { cn } from "@/lib/utils";
import type { HomeReviewItem } from "./home-types";

type Decision = "approved_output" | "rejected_output";

export function HomeReviewQueue({
  items,
  onReviewSaved,
}: {
  items: HomeReviewItem[];
  onReviewSaved?: () => void;
}) {
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(outputId: string, reviewStatus: Decision) {
    if (pendingId) return;
    setError(null);
    setPendingId(outputId);
    setDecided((current) => ({ ...current, [outputId]: reviewStatus }));
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(outputId)}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Review failed");
      }
      onReviewSaved?.();
    } catch (cause) {
      setDecided((current) => {
        const next = { ...current };
        delete next[outputId];
        return next;
      });
      setError(
        cause instanceof Error && cause.message !== "Review failed"
          ? cause.message
          : "Could not save that review. Try again."
      );
    } finally {
      setPendingId(null);
    }
  }

  const visible = items.filter((item) => !decided[item.outputId]);

  if (visible.length === 0) {
    return <EmptyState icon="check" title="Nothing to review" />;
  }

  return (
    <div className="flex min-w-0 flex-col">
      {error && (
        <p role="alert" className="wb-notice mb-2" data-tone="bad">
          <Icon name="alert" size={16} className="shrink-0 text-bad" />
          {error}
        </p>
      )}
      <ul className="flex flex-col">
        {visible.map((item) => {
          const busy = pendingId === item.outputId;
          return (
            <li
              key={item.outputId}
              className={cn(
                "flex min-w-0 items-center gap-3.5 border-t border-hairline py-2.5 transition-opacity duration-[var(--pf-dur-state)] ease-pf max-[767px]:gap-3",
                busy && "opacity-50"
              )}
            >
              <Link
                href={item.href}
                // prefetch-off: one link per queued output; each would prefetch its detail route on load.
                prefetch={false}
                className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-lg max-[767px]:gap-3"
              >
                <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-media">
                  <ReviewThumb item={item} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="line-clamp-1 text-[14px] font-semibold leading-[18px] text-fg [overflow-wrap:anywhere] group-hover:underline group-hover:decoration-fg-muted group-hover:underline-offset-2">
                    {item.title}
                  </span>
                  <span className="wb-meta truncate">{item.meta}</span>
                </span>
              </Link>
              <span className="flex shrink-0 items-center gap-1.5">
                <IconButton
                  icon="x"
                  label="Reject output"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void decide(item.outputId, "rejected_output")}
                />
                <IconButton
                  icon="check"
                  label="Approve output"
                  variant="strong"
                  disabled={busy}
                  onClick={() => void decide(item.outputId, "approved_output")}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewThumb({ item }: { item: HomeReviewItem }) {
  const source = `/api/files/${encodeURIComponent(item.outputId)}`;
  if (item.mediaType === "video") {
    return (
      <VideoFramePreview src={source} label="Output preview" className="size-full object-cover" />
    );
  }
  return (
    <Image
      src={source}
      alt=""
      fill
      sizes="48px"
      unoptimized
      className="object-cover"
    />
  );
}
