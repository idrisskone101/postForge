export type JobsStatusFilter = "all" | "active" | "completed" | "failed";
export type JobsTypeFilter = "all" | "image" | "video";

export type JobOutputPreview = {
  id: string;
  type: string;
};

export type JobActivityItem = {
  id: string;
  type: string;
  model: string;
  status: string;
  queueStage: string | null;
  prompt: string;
  input: unknown;
  tags: string[];
  estimatedCost: number | null;
  actualCost: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  outputs?: JobOutputPreview[];
};

export type JobsCounts = {
  processing: number;
  queued: number;
  completed: number;
  failed: number;
  failedToday: number;
};

export type JobsActivityViewModel = {
  jobs: JobActivityItem[];
  counts: JobsCounts;
  status: JobsStatusFilter;
  type: JobsTypeFilter;
  page: number;
  pageSize: number;
  filteredTotal: number;
  /** Render time: anchors "Today" and the elapsed time of running jobs. */
  now: Date;
};
