import type { CostSummary } from "@/lib/costs/tracker";

export type HomeJob = {
  id: string;
  prompt: string;
  type: string;
  model: string;
  status: string;
  queueStage?: string | null;
  tags?: string[];
  createdAt: Date;
  productionContext?: {
    sourceDetail: string | null;
    identityDetail: string | null;
  };
  output?: {
    id: string;
    width?: number | null;
    height?: number | null;
    durationSec?: number | null;
    createdAt?: Date;
  } | null;
};

export type HomeMedia = {
  id: string;
  jobId: string;
  type: string;
  jobType: string;
  durationSec?: number | null;
  reviewStatus: string;
  model: string;
  prompt: string;
  isClone: boolean;
};

export type HomeDashboard = {
  todaySummary: CostSummary;
  /** Spend over the last 30 days. Null when it was not read. */
  monthSpend?: number | null;
  activeJobs: HomeJob[];
  activeJobCount?: number;
  /** Every active job split by media type, not only the visible rows. */
  activeByType?: { video: number; image: number };
  recentJobs: HomeJob[];
  completedThisWeek: number;
  /** Review decisions on outputs of jobs completed this week. */
  weekReview?: { approved: number; rejected: number };
  pendingReviewCount: number;
  oldestPendingAt?: Date | null;
  recentMedia: HomeMedia[];
  now?: Date;
};

/** One output waiting for a decision. Keyed by the output, since a job can have several. */
export type HomeReviewItem = {
  outputId: string;
  href: string;
  title: string;
  meta: string;
  mediaType: "image" | "video";
};
