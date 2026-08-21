import { type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  PlayCircle,
  Users,
} from "lucide-react";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { formatDuration } from "@/components/clone-output/parse";
import type {
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
  SourceVideoInput,
} from "@/components/clone-output/types";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function CloneOutputReviewSidebar({
  job,
  featured,
  sourceVideo,
  sourceTitle,
  sourceUrl,
  sourcePreviewUrl,
  avatarId,
  avatarPreviewUrl,
  identityName,
  reference,
}: {
  job: CloneOutputReviewJob;
  featured: CloneOutputReviewOutput | undefined;
  sourceVideo: SourceVideoInput | null;
  sourceTitle: string;
  sourceUrl: string | null | undefined;
  sourcePreviewUrl: string | null;
  avatarId: string | null;
  avatarPreviewUrl: string | null;
  identityName: string;
  reference: { id: string; label: string; previewUrl: string } | null;
}) {
  return (
    <aside className="space-y-5">
      <DetailSection title="Source Selection">
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sourceTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sourceVideo
                ? `${sourceVideo.width}x${sourceVideo.height} | ${formatDuration(sourceVideo.durationSec)}`
                : "Original source context"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 text-[13px] font-semibold text-accent-blue hover:underline"
                >
                  View original
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              )}
            </div>
          </div>
          {sourcePreviewUrl && sourceVideo && (
            <details className="rounded-lg border border-border bg-black/40 p-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
                <span className="inline-flex items-center gap-2">
                  <PlayCircle className="size-3.5 text-accent-green" />
                  View source video
                </span>
                <span className="text-[12px] uppercase tracking-wider text-muted-foreground">
                  {formatDuration(sourceVideo.durationSec)}
                </span>
              </summary>
              <div className="mt-2 overflow-hidden rounded-lg bg-black">
                <video
                  src={sourcePreviewUrl}
                  width={sourceVideo.width}
                  height={sourceVideo.height}
                  controls
                  preload="metadata"
                  className="max-h-80 w-full object-contain"
                />
              </div>
            </details>
          )}
        </div>
      </DetailSection>

      <DetailSection title="Identity Used">
        <div className="flex items-center gap-4">
          {avatarPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreviewUrl}
              alt={`${identityName} avatar`}
              className="size-12 shrink-0 rounded-full border border-border bg-white/[0.05] object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-white/[0.05]">
              <Users className="size-5 shrink-0 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{identityName}</p>
            <p className="mt-1 text-[11px] uppercase tracking-tight text-muted-foreground">
              Identity preserved for clone
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Production State">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-[12px] font-bold uppercase text-muted-foreground">
              Spend
            </p>
            <p className="text-lg font-semibold tracking-tight">
              {formatCost(job.actualCost ?? job.estimatedCost)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[12px] font-bold uppercase text-muted-foreground">
              Generation Time
            </p>
            <p className="text-lg font-semibold tracking-tight">
              {job.durationMs !== null
                ? `${(job.durationMs / 1000).toFixed(0)}s`
                : "Pending"}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Job Status</span>
            <span className="capitalize">{job.status}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Model</span>
            <span className="text-right">{job.model}</span>
          </div>
          {featured?.width && featured.height && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Resolution</span>
              <span>{featured.width}x{featured.height}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Created</span>
            <span>{formatRelativeDate(job.createdAt)}</span>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Input Checks">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Identity", ready: Boolean(avatarId) },
            { label: "Source", ready: Boolean(sourceVideo || job.tikTokSource) },
            { label: "Output", ready: Boolean(featured) },
          ].map((signal) => (
            <div
              key={signal.label}
              className="rounded-lg border border-border bg-muted/25 px-2 py-3 text-center"
            >
              {signal.ready ? (
                <Check className="mx-auto size-4 shrink-0 text-accent-green" />
              ) : (
                <AlertCircle className="mx-auto size-4 shrink-0 text-muted-foreground" />
              )}
              <p className="mt-1.5 text-[12px] font-semibold">{signal.label}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {signal.ready ? "Ready" : "Unavailable"}
              </p>
            </div>
          ))}
        </div>
      </DetailSection>

      {reference && (
        <DetailSection title="Reference">
          <div className="mb-3 min-w-0">
            <p className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">{reference.label}</p>
            <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">
              {reference.id}
            </p>
          </div>
          <a
            href={reference.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-border bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reference.previewUrl}
              alt={`${reference.label} used for this clone`}
              className="max-h-56 w-full object-contain transition-opacity hover:opacity-90"
            />
          </a>
        </DetailSection>
      )}
    </aside>
  );
}
