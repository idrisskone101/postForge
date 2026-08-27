import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ImageIcon, Play } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import {
  getJobActivityLabel,
  getJobDestination,
} from "@/lib/jobs/presentation";
import { VideoFramePreview } from "@/components/video-frame-preview";
import type { HomeJob } from "./home-types";

export function ActiveJobRow({ job }: { job: HomeJob }) {
  const contextDetail =
    job.productionContext?.identityDetail ?? job.productionContext?.sourceDetail ?? null;
  const meta = [job.model, contextDetail, formatRelativeDate(job.createdAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={getJobDestination(job)}
      prefetch={false}
      className="group flex min-w-0 items-center gap-3 border-t border-border py-3 transition-colors first:border-t-0 hover:bg-muted"
    >
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border",
          "bg-muted text-muted-foreground"
        )}
      >
        <JobThumb job={job} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[13px] font-semibold text-foreground">
          {getJobActivityLabel(job)}
        </strong>
        <span className="mt-0.5 line-clamp-1 break-words text-[12px] leading-[1.35] text-muted-foreground [overflow-wrap:anywhere]">
          {getJobPreview(job, 88)}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{meta}</span>
      </span>
      <span className="hidden min-[720px]:inline-flex">
        <JobStatusPill status={job.status} />
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function JobThumb({ job }: { job: HomeJob }) {
  if (job.output) return <JobMedia job={job} />;
  if (job.type === "video") return <Play className="size-3.5" />;
  return <ImageIcon className="size-3.5" />;
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const text = lastSpace > maxLength * 0.65 ? trimmed.slice(0, lastSpace) : trimmed;
  return `${text}…`;
}

function getJobPreview(job: HomeJob, maxLength = 96) {
  const prompt = summarizeGenerationPrompt(job.prompt);
  return prompt ? truncateAtWord(prompt, maxLength) : "Open this production job.";
}

function JobStatusPill({ status }: { status: string }) {
  const isProcessing = status === "processing";
  const isComplete = status === "completed";

  if (isComplete) {
    return (
      <span className="pf-status-success inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <Check className="size-3" />
        <span className="truncate">{status}</span>
      </span>
    );
  }

  if (isProcessing) {
    return (
      <span className="pf-status-warning inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <span className="pf-lamp" />
        <span className="truncate">{status}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-full items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
    >
      <span className="truncate">{status}</span>
    </span>
  );
}

function JobMedia({ job, priority = false }: { job: HomeJob; priority?: boolean }) {
  if (job.output) {
    const source = `/api/files/${encodeURIComponent(job.output.id)}`;
    if (job.type === "video") {
      return (
        <span className="absolute inset-0 bg-muted">
          <VideoFramePreview
            src={source}
            label={`${getJobActivityLabel(job)} preview`}
            className="size-full object-cover"
          />
        </span>
      );
    }
    return (
      <Image
        src={source}
        alt={`${getJobActivityLabel(job)} preview`}
        fill
        sizes="(max-width: 640px) 50vw, 280px"
        priority={priority}
        unoptimized
        className="object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground"
    >
      {job.type === "video" ? <Play className="size-5" /> : <ImageIcon className="size-5" />}
    </span>
  );
}
