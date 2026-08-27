"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ImageIcon, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { HomeJob, HomeReviewQueueProps } from "./home-types";
import { FileImage } from "@/components/file-image";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { HomeLaneEmpty } from "./home-panel";

export function HomeReviewQueue({ jobs, onReviewSaved }: HomeReviewQueueProps) {
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
      <HomeLaneEmpty
        icon={Check}
        iconTone="success"
        title="Queue cleared"
        description="Every visible output has a decision."
        className="min-h-[160px]"
      />
    );
  }

  return (
    <div data-home-review="true">
      {error && (
        <p className="mb-2 rounded-[8px] border border-border bg-muted px-3 py-2 text-[12px] text-[var(--pf-danger)]">
          {error}
        </p>
      )}
      <ul className="flex flex-col">
        {visibleJobs.map((job) => {
          const busy = pendingId === job.output?.id;
          return (
            <li
              key={job.id}
              data-home-row="true"
              className={cn(
                "flex items-center gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0",
                busy && "opacity-50"
              )}
            >
              <Link
                href={getJobHref(job)}
                prefetch={false}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted">
                  <ReviewThumb job={job} />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 break-words text-[13px] font-medium leading-[1.35] text-foreground [overflow-wrap:anywhere] group-hover:underline">
                    {summarizeGenerationPrompt(job.prompt) || "Open this production job."}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                    {job.model} · {job.type === "video" ? "Video" : "Image"}
                  </span>
                </span>
              </Link>
              <span className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!job.output || busy}
                  onClick={() => void decide(job, "approved_output")}
                  aria-label="Approve output"
                  title="Approve"
                  className="hover:border-[var(--pf-success)] hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)]"
                >
                  <Check />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!job.output || busy}
                  onClick={() => void decide(job, "rejected_output")}
                  aria-label="Reject output"
                  title="Reject"
                  className="hover:border-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                >
                  <X />
                </Button>
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
      className="grid size-full place-items-center bg-muted text-muted-foreground"
    >
      {job.type === "video" ? <Play className="size-4" /> : <ImageIcon className="size-4" />}
    </span>
  );
}
