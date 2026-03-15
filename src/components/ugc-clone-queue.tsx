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

export function UGCCloneQueue() {
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasActiveJobs = jobs.some(
    (j) => j.status === "queued" || j.status === "processing"
  );

  const fetchJobs = useCallback(async () => {
    try {
      const data = await apiGet<JobsResponse>(
        "/api/jobs?tag=ugc-clone&limit=10&sort=createdAt:desc"
      );
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

    // Poll while there are active jobs
    const interval = setInterval(() => {
      fetchJobs();
    }, hasActiveJobs ? 5000 : 30000);

    return () => clearInterval(interval);
  }, [fetchJobs, hasActiveJobs]);

  if (isLoading) {
    return null;
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="launch-card bg-card border border-border p-6">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Clone Queue
      </h3>
      <div className="space-y-1.5">
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
                "group flex items-center gap-3 rounded-md border border-border p-3 transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/50",
                isActive && "border-accent-blue/30 bg-accent-blue/5"
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {job.prompt.length > 40
                      ? job.prompt.slice(0, 40) + "..."
                      : job.prompt}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{job.model}</span>
                  <span>·</span>
                  <span>{formatCost(job.estimatedCost)}</span>
                  <span>·</span>
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
    </div>
  );
}
