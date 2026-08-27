import type { ComponentType, ReactNode } from "react";
import type { CostSummary } from "@/lib/costs/tracker";

export type HomeJob = {
  id: string;
  prompt: string;
  type: string;
  model: string;
  status: string;
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
  activeJobs: HomeJob[];
  activeJobCount?: number;
  recentJobs: HomeJob[];
  completedThisWeek: number;
  pendingReviewCount: number;
  recentMedia: HomeMedia[];
  now?: Date;
};

export type HomePanelHeaderProps = {
  title: string;
  action?: ReactNode;
};

export type HomePanelLinkProps = {
  href: string;
  children: ReactNode;
};

export type HomeLaneEmptyProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconTone?: "muted" | "success";
  className?: string;
};

export type HomeReviewQueueProps = {
  jobs: HomeJob[];
  onReviewSaved?: () => void;
};
