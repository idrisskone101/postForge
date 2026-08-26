export type JobsStatusFilter = "all" | "active" | "completed" | "failed";
export type JobsTypeFilter = "all" | "image" | "video";

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
};

export type JobsActivityViewModel = {
  jobs: JobActivityItem[];
  counts: {
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  status: JobsStatusFilter;
  type: JobsTypeFilter;
  page: number;
  pageSize: number;
  filteredTotal: number;
};

export const EMPTY_JOBS_ACTIVITY: JobsActivityViewModel = {
  jobs: [],
  counts: { active: 0, completed: 0, failed: 0, total: 0 },
  status: "all",
  type: "all",
  page: 1,
  pageSize: 40,
  filteredTotal: 0,
};
