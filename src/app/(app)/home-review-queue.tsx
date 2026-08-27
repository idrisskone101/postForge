"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ImageIcon, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeJob } from "./home-types";
import { FileImage } from "@/components/file-image";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";

export function HomeReviewQueue({
  jobs,
  onReviewSaved,
}: {
  jobs: HomeJob[];
  onReviewSaved?: () => void;
}) {
  const [decided, setDecided] = useState<Record<string, "approved_output" | "rejected_output">>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(job: HomeJob, reviewStatus: "approved_output" | "rejected_output") {
    if (!job.output || pendingId) return;
    const outputId = job.output.id;
    setError(null);
    setPendingId(outputId);
    setDecided((current) => ({ ...current, [job.id]: reviewStatus }));
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
        delete next[job.id];
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

  const visibleJobs = jobs.filter((job) => !decided[job.id]);

  if (visibleJobs.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center px-4 py-6 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--pf-active)] text-[var(--pf-success)]">
          <Check className="size-4" />
        </span>
        <p className="mt-2 text-[13px] font-medium text-[var(--pf-ink)]">Queue cleared</p>
        <p className="mt-0.5 text-[12px] text-[var(--pf-muted)]">
          Every visible output has a decision.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-3 py-2 text-[12px] text-[var(--pf-danger)]">
          {error}
        </p>
      )}
      <ul className="flex flex-col">
        {visibleJobs.map((job) => {
          const busy = pendingId === job.output?.id;
          return (
            <li
              key={job.id}
              className={cn(
                "flex items-center gap-3 border-t border-[var(--pf-border)] py-3 first:border-t-0 first:pt-0 last:pb-0",
                busy && "opacity-50"
              )}
            >
              <Link
                href={getJobHref(job)}
                prefetch={false}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)]">
                  <ReviewThumb job={job} />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 break-words text-[13px] font-medium leading-[1.35] text-[var(--pf-ink)] [overflow-wrap:anywhere] group-hover:underline">
                    {summarizeGenerationPrompt(job.prompt) || "Open this production job."}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-muted)]">
                    {job.model} · {job.type === "video" ? "Video" : "Image"}
                  </span>
                </span>
              </Link>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={!job.output || busy}
                  onClick={() => void decide(job, "approved_output")}
                  aria-label="Approve output"
                  title="Approve"
                  className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] transition-colors duration-[180ms] hover:border-[var(--pf-success)] hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={!job.output || busy}
                  onClick={() => void decide(job, "rejected_output")}
                  aria-label="Reject output"
                  title="Reject"
                  className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] transition-colors duration-[180ms] hover:border-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


function getJobHref(job: HomeJob) {
  const isClone = job.type === "video" && job.tags?.includes("ugc-clone") === true;
  return isClone ? `/ugc-clone/${job.id}` : `/generate/${job.id}`;
}

function ReviewThumb({ job }: { job: HomeJob }) {
  if (job.output) {
    const source = `/api/files/${encodeURIComponent(job.output.id)}`;
    if (job.type === "video") {
      return (
        <VideoFramePreview
          src={source}
          label="Output preview"
          className="size-full object-cover"
        />
      );
    }
    return (
      <FileImage
        src={source}
        alt="Output preview"
        sizes="56px"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-full place-items-center bg-[var(--pf-active)] text-[var(--pf-muted)]"
    >
      {job.type === "video" ? <Play className="size-4" /> : <ImageIcon className="size-4" />}
    </span>
  );
}