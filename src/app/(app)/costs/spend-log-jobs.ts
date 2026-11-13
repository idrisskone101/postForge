import { outputTitle } from "@/lib/ai/output-presentation";
import type { CostLogEntry } from "@/lib/costs/tracker";
import { getJobDestination } from "@/lib/jobs/presentation";
import type { SpendLogRow } from "./types";

export type CostLogJobRecord = {
  id: string;
  type: string;
  status: string;
  model: string;
  prompt: string;
  tags: string[];
  input: unknown;
  outputs: Array<{ id: string; type: string }>;
};

/** Joins a page of cost rows to their jobs; a row whose job is gone keeps `job: null`. */
export function joinCostLogJobs(entries: CostLogEntry[], jobs: CostLogJobRecord[]): SpendLogRow[] {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return entries.map((entry) => {
    const job = byId.get(entry.jobId);
    if (!job) return { ...entry, job: null };
    const image = job.outputs.find((output) => output.type === "image");
    return {
      ...entry,
      job: {
        title: outputTitle({ prompt: job.prompt, model: job.model }),
        href: getJobDestination(job),
        thumbnailSrc: image ? `/api/files/${encodeURIComponent(image.id)}/thumbnail?w=240` : null,
      },
    };
  });
}
