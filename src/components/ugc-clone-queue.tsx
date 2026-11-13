"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  Button,
  EmptyState,
  Panel,
  Skeleton,
  StatusBadge,
} from "@/components/workbench";

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

    const interval = setInterval(() => {
      fetchJobs();
    }, hasActiveJobs ? 5000 : 30000);

    return () => clearInterval(interval);
  }, [fetchJobs, hasActiveJobs]);

  return (
    <Panel pad="wide" className="wb-fade-in gap-1.5 pb-2.5">
      <div className="flex h-8 shrink-0 items-center">
        <h2 className="wb-panel-title">Recent clone activity</h2>
      </div>

      {loadError && jobs.length === 0 ? (
        <EmptyState
          icon="alert"
          tone="error"
          title="Clone activity could not load"
          detail={loadError}
          className="mb-2.5 [overflow-wrap:anywhere]"
        >
          <Button variant="strong" onClick={() => void fetchJobs()}>
            Try again
          </Button>
        </EmptyState>
      ) : isLoading ? (
        <div aria-hidden="true" className="flex flex-col">
          {[0, 1, 2].map((index) => (
            <div key={index} className={`${ROW} border-t border-hairline`}>
              <Skeleton shape="tile" className="h-12 w-9 shrink-0 rounded-sm" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="w-48 max-w-full" />
                <Skeleton className="w-32 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon="clone" title="No clone jobs yet" className="mb-2.5" />
      ) : (
        <ul className="flex flex-col">
          {jobs.map((job) => (
            <li key={job.id} className="border-t border-hairline">
              <CloneJobRow job={job} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const ROW = "flex min-w-0 items-center gap-3.5 py-2.5";
const MONO = "wb-mono shrink-0 text-fg-secondary";

function CloneJobRow({ job }: { job: CloneJob }) {
  const output = job.status === "completed" ? job.outputs[0] : undefined;
  return (
    <Link
      href={`/ugc-clone/${job.id}`}
      className={`${ROW} -mx-2 rounded-lg px-2 transition-colors duration-[160ms] ease-pf hover:bg-raised max-md:flex-wrap`}
    >
      {output ? (
        <video
          src={`/api/files/${output.id}#t=0.1`}
          muted
          preload="metadata"
          aria-hidden="true"
          className="h-12 w-9 shrink-0 rounded-sm bg-media object-cover"
        />
      ) : (
        <span aria-hidden="true" className="h-12 w-9 shrink-0 rounded-sm bg-media" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold leading-[18px] text-fg">
          {job.prompt}
        </span>
        <span
          className={
            job.error
              ? "line-clamp-2 text-[13px] leading-4 text-bad [overflow-wrap:anywhere]"
              : "truncate text-[13px] leading-4 text-fg-muted"
          }
        >
          {job.error ? `${job.model} · ${job.error}` : job.model}
        </span>
      </span>
      <span className="flex w-[120px] shrink-0 max-md:w-auto">
        <CloneJobStatus status={job.status} />
      </span>
      <span className={`${MONO} w-[120px] max-md:ml-[50px] max-md:w-auto max-md:basis-full max-md:order-last`}>
        {formatRelativeDate(job.createdAt)}
        <span className="md:hidden"> · {formatCost(job.estimatedCost)}</span>
      </span>
      <span className={`${MONO} w-14 text-right max-md:hidden`}>
        {formatCost(job.estimatedCost)}
      </span>
    </Link>
  );
}

function CloneJobStatus({ status }: { status: CloneJob["status"] }) {
  if (status === "completed") return <StatusBadge tone="ok" label="Completed" />;
  if (status === "failed") return <StatusBadge tone="bad" label="Failed" />;
  if (status === "queued") return <StatusBadge tone="warn" label="Queued" />;
  return (
    <span className="text-[13px] font-semibold leading-[22px] text-ember-text">Running</span>
  );
}
