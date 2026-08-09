import type { DeriveTemplateFromReferencesResult } from "@/lib/ai/slideshow-creator";
import { prisma } from "@/lib/db";
import { SlideshowApiError } from "@/lib/slideshow/errors";

const CACHE_KEY = "internal/slideshow-derive-idempotency.json";
const MAX_ENTRIES = 100;
const UNCERTAIN_RETRY_DELAY_MS = 10 * 60 * 1000;

type CacheEntry = {
  id: string;
  fingerprint: string;
  createdAt: string;
  result?: DeriveTemplateFromReferencesResult;
  uncertainError?: string;
  retryAfter?: string;
};

type InFlight = {
  fingerprint: string;
  promise: Promise<DeriveTemplateFromReferencesResult>;
};

const globalCache = globalThis as typeof globalThis & {
  __postforgeSlideshowDerivations?: Map<string, InFlight>;
};
const inFlight =
  globalCache.__postforgeSlideshowDerivations ?? new Map<string, InFlight>();
globalCache.__postforgeSlideshowDerivations = inFlight;

function decodeEntries(data: Uint8Array | null | undefined): CacheEntry[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(Buffer.from(data).toString("utf8"));
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is CacheEntry =>
            entry &&
            typeof entry === "object" &&
            typeof entry.id === "string" &&
            typeof entry.fingerprint === "string",
        )
      : [];
  } catch {
    return [];
  }
}

async function readEntry(id: string) {
  const stored = await prisma.storedAsset.findUnique({
    where: { key: CACHE_KEY },
    select: { data: true },
  });
  return decodeEntries(stored?.data).find((entry) => entry.id === id) ?? null;
}

async function writeEntry(entry: CacheEntry) {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${CACHE_KEY}, 0))
    `;
    const stored = await transaction.storedAsset.findUnique({
      where: { key: CACHE_KEY },
      select: { data: true },
    });
    const entries = decodeEntries(stored?.data)
      .filter((candidate) => candidate.id !== entry.id)
      .filter(
        (candidate) =>
          !candidate.retryAfter || Date.parse(candidate.retryAfter) > Date.now(),
      );
    const data = Uint8Array.from(
      Buffer.from(JSON.stringify([entry, ...entries].slice(0, MAX_ENTRIES)), "utf8"),
    );
    await transaction.storedAsset.upsert({
      where: { key: CACHE_KEY },
      update: { data },
      create: { key: CACHE_KEY, data },
    });
  });
}

function assertMatchingFingerprint(entry: Pick<CacheEntry, "fingerprint">, fingerprint: string) {
  if (entry.fingerprint !== fingerprint) {
    throw new SlideshowApiError(
      409,
      "derive_idempotency_conflict",
      "This visual-style request key was already used for different references.",
    );
  }
}

function isUncertainProviderError(error: unknown) {
  return (
    (error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        /timed?\s*out|aborted/i.test(error.message))) ??
    false
  );
}

export async function deriveTemplateIdempotently(input: {
  id: string;
  fingerprint: string;
  run: () => Promise<DeriveTemplateFromReferencesResult>;
}) {
  const cached = await readEntry(input.id);
  if (cached) {
    assertMatchingFingerprint(cached, input.fingerprint);
    if (cached.result) return cached.result;
    if (
      cached.uncertainError &&
      cached.retryAfter &&
      Date.parse(cached.retryAfter) > Date.now()
    ) {
      throw new SlideshowApiError(
        409,
        "derive_outcome_uncertain",
        cached.uncertainError,
      );
    }
  }

  const active = inFlight.get(input.id);
  if (active) {
    assertMatchingFingerprint(active, input.fingerprint);
    return active.promise;
  }

  const promise = (async () => {
    try {
      const result = await input.run();
      await writeEntry({
        id: input.id,
        fingerprint: input.fingerprint,
        createdAt: new Date().toISOString(),
        result,
      });
      return result;
    } catch (error) {
      if (isUncertainProviderError(error)) {
        const uncertainError =
          "The Gemini request timed out after submission, so PostForge will not submit the same visual-style request again yet. Try later from Saved reference images to avoid a duplicate model charge.";
        await writeEntry({
          id: input.id,
          fingerprint: input.fingerprint,
          createdAt: new Date().toISOString(),
          uncertainError,
          retryAfter: new Date(Date.now() + UNCERTAIN_RETRY_DELAY_MS).toISOString(),
        });
        throw new SlideshowApiError(
          409,
          "derive_outcome_uncertain",
          uncertainError,
        );
      }
      throw error;
    }
  })();

  inFlight.set(input.id, { fingerprint: input.fingerprint, promise });
  try {
    return await promise;
  } finally {
    inFlight.delete(input.id);
  }
}
