export const OUTPUT_REVIEW_STATUSES = [
  {
    value: "needs_review",
    label: "Needs Review",
    tone: "neutral",
  },
  {
    value: "approved_output",
    label: "Approved Output",
    tone: "approved",
  },
  {
    value: "rejected_output",
    label: "Rejected Output",
    tone: "rejected",
  },
] as const;

export type OutputReviewStatus = (typeof OUTPUT_REVIEW_STATUSES)[number]["value"];
export type OutputReviewStatusTone = (typeof OUTPUT_REVIEW_STATUSES)[number]["tone"];
export type SerializedOutputReviewStatus = ReturnType<
  typeof serializeOutputReviewStatus
>;

const outputReviewStatusByValue = new Map(
  OUTPUT_REVIEW_STATUSES.map((status) => [status.value, status])
);

export function normalizeOutputReviewStatus(
  value: unknown
): OutputReviewStatus {
  return typeof value === "string" &&
    outputReviewStatusByValue.has(value as OutputReviewStatus)
    ? (value as OutputReviewStatus)
    : "needs_review";
}

export function serializeOutputReviewStatus(value: unknown): {
  value: OutputReviewStatus;
  label: string;
  tone: OutputReviewStatusTone;
} {
  const normalized = normalizeOutputReviewStatus(value);
  return outputReviewStatusByValue.get(normalized) ?? OUTPUT_REVIEW_STATUSES[0];
}

export class OutputReviewStatusError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OutputReviewStatusError";
  }
}

export async function updateOutputReviewStatus(params: {
  outputId: string;
  reviewStatus: unknown;
  update: (
    outputId: string,
    reviewStatus: OutputReviewStatus
  ) => Promise<{ id: string; reviewStatus: string | null }>;
}): Promise<{
  id: string;
  reviewStatus: ReturnType<typeof serializeOutputReviewStatus>;
}> {
  if (
    typeof params.reviewStatus !== "string" ||
    !outputReviewStatusByValue.has(params.reviewStatus as OutputReviewStatus)
  ) {
    throw new OutputReviewStatusError("Invalid output review status", 400);
  }

  const reviewStatus = params.reviewStatus as OutputReviewStatus;
  const output = await params.update(params.outputId, reviewStatus);

  return {
    id: output.id,
    reviewStatus: serializeOutputReviewStatus(output.reviewStatus),
  };
}
