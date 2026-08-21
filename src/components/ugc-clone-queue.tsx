"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  History,
} from "lucide-react";

interface CloneJob {
  id: string;
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  estimatedCost: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  outputs: {
    id: string;
    type: string;
    mimeType: string;
  }[];
}

interface JobsResponse {
  jobs: CloneJob[];
  total: number;
}

export function UGCCloneQueue() {
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasActiveJobs = jobs.some(
    (j) => j.status === "queued" || j.status === "processing"
  );

  const fetchJobs = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await apiGet<JobsResponse>(
        "/api/jobs?tag=ugc-clone&limit=10&sort=createdAt:desc"
      );
      setJobs((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data.jobs)) return prev;
        return data.jobs;
      });
    } catch (err) {
      console.error("Failed to load clone jobs:", err);
      setLoadError(
        err instanceof Error ? err.message : "Failed to load clone activity."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    // Poll while there are active jobs
    const interval = setInterval(() => {
      fetchJobs();
    }, hasActiveJobs ? 5000 : 30000);

    return () => clearInterval(interval);
  }, [fetchJobs, hasActiveJobs]);

  return (
    <section className="rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)]">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/35">
            <History className="size-4 text-muted-foreground" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Recent clone activity</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasActiveJobs ? "Active jobs update automatically." : "Latest generated, queued, and failed clones."}
            </p>
          </div>
        </div>
        {jobs.length > 0 && (
          <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            {jobs.length} recent
          </span>
        )}
      </div>

      {loadError && jobs.length === 0 ? (
        <div className="flex w-full min-w-0 flex-col items-center px-5 py-7 text-center">
          <XCircle className="size-5 shrink-0 text-destructive" />
          <p className="mt-2 text-sm font-semibold">Couldn&apos;t load clone activity</p>
          <p className="mt-1 min-w-0 max-w-md break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchJobs()}
            className="mt-3 h-8 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium">No clone jobs yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            Completed and in-progress clones will appear here after the first reference is approved.
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-4">
        {jobs.map((job) => {
          const config = STATUS_CONFIG[job.status];
          const StatusIcon = config.icon;
          const isActive =
            job.status === "queued" || job.status === "processing";

          return (
            <Link
              key={job.id}
              href={`/ugc-clone/${job.id}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-border p-2.5 transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground/20 hover:bg-muted/50 hover:shadow-[var(--pf-shadow-2xs)]",
                isActive && "border-accent-blue/30 bg-accent-blue/5"
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  config.bgClassName
                )}
              >
                <StatusIcon
                  className={cn(
                    "size-3.5",
                    config.className,
                    job.status === "processing" && "animate-spin"
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {job.prompt.length > 40
                      ? job.prompt.slice(0, 40) + "..."
                      : job.prompt}
                  </p>
                  <span className={cn("shrink-0 text-[12px] font-bold uppercase tracking-wider", config.className)}>
                    {config.label}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground font-mono">
                  <span>{job.model}</span>
                  <span className="text-border">|</span>
                  <span>{formatCost(job.estimatedCost)}</span>
                  <span className="text-border">|</span>
                  <span>{formatRelativeDate(job.createdAt)}</span>
                </div>
              </div>

              {job.status === "completed" && job.outputs[0] && (
                <div className="size-9 shrink-0 rounded-md overflow-hidden border border-border">
                  <video
                    src={`/api/files/${job.outputs[0].id}`}
                    className="size-full object-cover"
                    muted
                  />
                </div>
              )}

              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            </Link>
          );
        })}
        </div>
      )}
    </section>
  );
}


const STATUS_CONFIG = {
  queued: {
    icon: Clock,
    label: "Queued",
    className: "text-amber-500",
    bgClassName: "bg-amber-500/10",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    className: "text-accent-blue",
    bgClassName: "bg-accent-blue/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-accent-green",
    bgClassName: "bg-accent-green/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-destructive",
    bgClassName: "bg-destructive/10",
  },
} as const;