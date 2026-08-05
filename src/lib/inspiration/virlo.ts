const VIRLO_API_BASE = "https://api.virlo.ai/v1";
const REQUEST_TIMEOUT_MS = 15_000;
const LOOKUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;
const DEFAULT_CREATOR_VIDEO_BACKFILL_LIMIT = 100;

interface VirloEnvelope<T> {
  data: T;
}

interface StartCreatorLookupResponse {
  job_id: string;
}

interface PollCreatorLookupResponse {
  status: "processing" | "completed" | "failed";
  result?: VirloCreatorLookupResult | null;
  error?: string | null;
}

export interface VirloCreatorLookupResult {
  username?: string | null;
  platform?: string | null;
  stats?: Record<string, unknown> | null;
  hashtags?: Array<Record<string, unknown>> | null;
  profile?: Record<string, unknown> | null;
  videos?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
}

export class VirloApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "VirloApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseProviderMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const directMessage = record.message ?? record.error;
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage.trim();
  }

  const nested = record.data;
  if (!nested || typeof nested !== "object") return null;

  const nestedRecord = nested as Record<string, unknown>;
  const nestedMessage = nestedRecord.message ?? nestedRecord.error;
  return typeof nestedMessage === "string" && nestedMessage.trim()
    ? nestedMessage.trim()
    : null;
}

async function requestVirlo<T>(path: string): Promise<T> {
  const { getProviderCredential } = await import("@/lib/providers/credentials");
  const storedKey = await getProviderCredential("virlo");
  const apiKey = storedKey ?? process.env.VIRLO_API_KEY;
  if (!apiKey) {
    throw new VirloApiError("VIRLO_API_KEY is not configured.", 500);
  }

  const response = await fetch(`${VIRLO_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    let message = `Virlo request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as unknown;
      const providerMessage = parseProviderMessage(body);
      if (providerMessage) {
        message = providerMessage;
      }
    } catch {
      // ignore JSON parse errors
    }

    if (response.status === 404 && path.includes("/satellite/creator/status/")) {
      message = "Virlo lookup job expired before it could be read.";
    } else if (response.status === 429) {
      message = "Virlo rate limit reached. Try again in a moment.";
    }

    throw new VirloApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function normalizeTikTokHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new VirloApiError("TikTok handle is required.", 400);
  }

  const urlMatch = trimmed.match(/tiktok\.com\/@([^/?#]+)/i);
  const rawHandle = (urlMatch?.[1] ?? trimmed).replace(/^@/, "").trim();
  const normalized = rawHandle.split(/[/?#]/)[0].toLowerCase();

  if (!normalized || !/^[a-z0-9._-]+$/.test(normalized)) {
    throw new VirloApiError("Invalid TikTok handle.", 400);
  }

  return normalized;
}

export function buildTikTokProfileUrl(handle: string): string {
  return `https://www.tiktok.com/@${handle}`;
}

export function extractTikTokVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/);
  return match?.[1] ?? null;
}

export function deriveTikTokEmbedUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  return `https://www.tiktok.com/embed/v3/${videoId}`;
}

function getCreatorVideoBackfillLimit(): number {
  const configured = Number(process.env.VIRLO_CREATOR_VIDEO_BACKFILL_LIMIT);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_CREATOR_VIDEO_BACKFILL_LIMIT;
}

export async function lookupTikTokCreator(
  handle: string,
  maxVideos = getCreatorVideoBackfillLimit()
): Promise<VirloCreatorLookupResult> {
  const normalized = normalizeTikTokHandle(handle);
  const params = new URLSearchParams({
    include: "videos",
    max_videos: String(maxVideos),
  });

  const start = await requestVirlo<VirloEnvelope<StartCreatorLookupResponse>>(
    `/satellite/creator/tiktok/${encodeURIComponent(normalized)}?${params.toString()}`
  );

  const jobId = start.data.job_id;
  if (!jobId) {
    throw new VirloApiError("Virlo lookup did not return a job ID.", 502);
  }

  const deadline = Date.now() + LOOKUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const poll = await requestVirlo<VirloEnvelope<PollCreatorLookupResponse>>(
      `/satellite/creator/status/${jobId}`
    );

    if (poll.data.status === "completed") {
      if (!poll.data.result) {
        throw new VirloApiError("Virlo lookup completed without a result payload.", 502);
      }
      return poll.data.result;
    }

    if (poll.data.status === "failed") {
      throw new VirloApiError(
        poll.data.error || "Virlo lookup failed.",
        502
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new VirloApiError("Virlo lookup timed out after 60 seconds.", 504);
}
