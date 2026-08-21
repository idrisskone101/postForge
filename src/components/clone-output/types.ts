import type {
  OutputReviewStatus,
  SerializedOutputReviewStatus,
} from "@/lib/output-review-status";

export interface CloneOutputActionFeedback {
  tone: "success" | "error";
  message: string;
}

export interface CloneOutputReviewOutput {
  id: string;
  url: string;
  type: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  reviewStatus: SerializedOutputReviewStatus;
  createdAt: string;
}

export interface CloneOutputReviewJob {
  id: string;
  type: "image" | "video";
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  input: Record<string, unknown>;
  output: unknown;
  estimatedCost: number;
  actualCost: number | null;
  durationMs: number | null;
  error: string | null;
  tags: string[];
  outputs: CloneOutputReviewOutput[];
  tikTokSource: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SourceVideoInput {
  sourceId: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

export type CloneOutputHandoffState = "idle" | "pending" | "success" | "error";

export type CloneOutputReviewDetailProps = {
  job: CloneOutputReviewJob;
  isRetrying: boolean;
  pendingReviewStatus?: OutputReviewStatus | null;
  handoffState?: CloneOutputHandoffState;
  actionFeedback?: CloneOutputActionFeedback | null;
  onBack: () => void;
  onRetry: () => void;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onReviewStatusChange?: (
    output: CloneOutputReviewOutput,
    status: OutputReviewStatus
  ) => void;
  onHandoff?: (output: CloneOutputReviewOutput) => void;
  onNewClone: () => void;
};
