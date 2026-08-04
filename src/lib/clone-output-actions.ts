import type {
  OutputReviewStatus,
  SerializedOutputReviewStatus,
} from "@/lib/output-review-status";

type Fetcher = typeof fetch;
type ClipboardWriter = (value: string) => Promise<void>;

async function getResponseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return response.statusText || fallback;
  }
}

export async function updateCloneOutputReviewStatus({
  outputId,
  reviewStatus,
  request = fetch,
}: {
  outputId: string;
  reviewStatus: OutputReviewStatus;
  request?: Fetcher;
}): Promise<SerializedOutputReviewStatus> {
  const response = await request(`/api/files/${encodeURIComponent(outputId)}/review-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewStatus }),
  });

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, "Failed to update output review status.")
    );
  }

  const result = (await response.json()) as {
    reviewStatus: SerializedOutputReviewStatus;
  };
  return result.reviewStatus;
}

export function buildCloneOutputHandoffUrl(outputId: string, origin: string) {
  return new URL(
    `/api/files/${encodeURIComponent(outputId)}`,
    origin.endsWith("/") ? origin : `${origin}/`
  ).toString();
}

export async function handoffCloneOutput({
  outputId,
  origin,
  writeText,
}: {
  outputId: string;
  origin: string;
  writeText: ClipboardWriter;
}) {
  const url = buildCloneOutputHandoffUrl(outputId, origin);
  await writeText(url);
  return url;
}

export async function writeCloneHandoffText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard access is unavailable in this browser.");
    }
  } finally {
    textarea.remove();
  }
}

