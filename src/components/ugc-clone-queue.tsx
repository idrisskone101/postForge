"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";

import { apiGet } from "@/lib/api/client";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

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

interface UGCCloneQueueProps {
  activeJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
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

export function UGCCloneQueue({ activeJobId, onSelectJob }: UGCCloneQueueProps) {
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveJobs = jobs.some((job) => job.status === "queued" || job.status === "processing");
  const completedCount = jobs.filter((job) => job.status === "completed").length;

  const fetchJobs = useCallback(async () => {
    try {
      const data = await apiGet<JobsResponse>("/api/jobs?tag=ugc-clone&limit=10&sort=createdAt:desc");
      setJobs((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data.jobs)) return prev;
        return data.jobs;
      });
    } catch (err) {
      console.error("Failed to load clone jobs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    const interval = setInterval(fetchJobs, hasActiveJobs ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [fetchJobs, hasActiveJobs]);

  useEffect(() => {
    if (hasActiveJobs) {
      setIsOpen(true);
    }
  }, [hasActiveJobs]);

  useEffect(() => {
    if (!hasActiveJobs && jobs.length > 0) {
      setIsOpen(false);
    }
  }, [hasActiveJobs, jobs.length]);

  if (isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[32px] border border-border bg-card/85 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-[24px] px-2 py-2 text-left"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Recent Activity
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{jobs.length} recent clones</span>
            {hasActiveJobs ? (
              <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-blue">
                Live queue
              </span>
            ) : (
              <span className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {completedCount} completed
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeJobId ? (
            <span className="rounded-full border border-accent-green/20 bg-accent-green/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-green">
              Viewing {activeJobId.slice(0, 8)}
            </span>
          ) : null}
          <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background/40">
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="mt-4 space-y-2">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status];
            const StatusIcon = config.icon;
            const isSelected = activeJobId === job.id;

            return (
              <div
                key={job.id}
                className={cn(
                  "group flex items-center gap-3 rounded-[24px] border p-3 transition-all",
                  isSelected
                    ? "border-accent-green/30 bg-accent-green/5"
                    : "border-border/70 bg-background/30 hover:border-foreground/20 hover:bg-background/50",
                  (job.status === "queued" || job.status === "processing") && "border-accent-blue/20 bg-accent-blue/5"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectJob?.(job.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-2xl", config.bgClassName)}>
                    <StatusIcon
                      className={cn(
                        "size-4",
                        config.className,
                        job.status === "processing" && "animate-spin"
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {job.prompt.length > 52 ? `${job.prompt.slice(0, 52)}...` : job.prompt}
                      </p>
                      <span
                        className={cn(
                          "hidden rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:inline-flex",
                          config.bgClassName,
                          config.className
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{job.model}</span>
                      <span>{formatCost(job.estimatedCost)}</span>
                      <span>{formatRelativeDate(job.createdAt)}</span>
                    </div>
                  </div>

                  {job.status === "completed" && job.outputs[0] ? (
                    <div className="hidden size-11 shrink-0 overflow-hidden rounded-2xl border border-border/70 sm:block">
                      <video src={`/api/files/${job.outputs[0].id}`} className="size-full object-cover" muted />
                    </div>
                  ) : null}
                </button>

                <Link
                  href={`/ugc-clone/${job.id}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Open clone ${job.id} permalink`}
                >
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
