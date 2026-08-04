import type { GeneratedFile, GenerationJob } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type HomeReviewJob = GenerationJob & {
  outputs: GeneratedFile[];
};

export async function getPendingReviewHomeJobs(
  limit = 4
): Promise<HomeReviewJob[]> {
  const validJobs: HomeReviewJob[] = [];
  let offset = 0;

  while (validJobs.length < limit) {
    const take = Math.max((limit - validJobs.length) * 3, limit);
    const candidates = await prisma.$queryRaw<
      Array<{
        fileId: string;
        fileJobId: string;
        fileType: string;
        originalUrl: string;
        localPath: string;
        filename: string;
        mimeType: string;
        width: number | null;
        height: number | null;
        durationSec: number | null;
        fileSizeBytes: number | null;
        reviewStatus: string;
        fileCreatedAt: Date;
        jobId: string;
        jobType: string;
        model: string;
        status: string;
        prompt: string;
        input: GenerationJob["input"];
        output: GenerationJob["output"];
        falRequestId: string | null;
        queueStage: string | null;
        lockOwner: string | null;
        lockExpiresAt: Date | null;
        attempts: number;
        nextAttemptAt: Date | null;
        lastPolledAt: Date | null;
        estimatedCost: number | null;
        actualCost: number | null;
        durationMs: number | null;
        error: string | null;
        jobCreatedAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        tags: string[];
      }>
    >`
      SELECT
        f."id" AS "fileId",
        f."jobId" AS "fileJobId",
        f."type" AS "fileType",
        f."originalUrl",
        f."localPath",
        f."filename",
        f."mimeType",
        f."width",
        f."height",
        f."durationSec",
        f."fileSizeBytes",
        f."reviewStatus",
        f."createdAt" AS "fileCreatedAt",
        j."id" AS "jobId",
        j."type" AS "jobType",
        j."model",
        j."status",
        j."prompt",
        j."input",
        j."output",
        j."falRequestId",
        j."queueStage",
        j."lockOwner",
        j."lockExpiresAt",
        j."attempts",
        j."nextAttemptAt",
        j."lastPolledAt",
        j."estimatedCost",
        j."actualCost",
        j."durationMs",
        j."error",
        j."createdAt" AS "jobCreatedAt",
        j."startedAt",
        j."completedAt",
        j."tags"
      FROM "GeneratedFile" f
      INNER JOIN "GenerationJob" j ON j."id" = f."jobId"
      WHERE
        f."reviewStatus" = 'needs_review'
        AND j."status" = 'completed'
      ORDER BY f."createdAt" DESC, f."id" DESC
      OFFSET ${offset}
      LIMIT ${take}
    `;

    if (candidates.length === 0) break;
    offset += candidates.length;

    for (const row of candidates) {
      validJobs.push({
        id: row.jobId,
        type: row.jobType,
        model: row.model,
        status: row.status,
        prompt: row.prompt,
        input: row.input,
        output: row.output,
        falRequestId: row.falRequestId,
        queueStage: row.queueStage,
        lockOwner: row.lockOwner,
        lockExpiresAt: row.lockExpiresAt,
        attempts: row.attempts,
        nextAttemptAt: row.nextAttemptAt,
        lastPolledAt: row.lastPolledAt,
        estimatedCost: row.estimatedCost,
        actualCost: row.actualCost,
        durationMs: row.durationMs,
        error: row.error,
        createdAt: row.jobCreatedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        tags: row.tags,
        outputs: [
          {
            id: row.fileId,
            jobId: row.fileJobId,
            type: row.fileType,
            originalUrl: row.originalUrl,
            localPath: row.localPath,
            filename: row.filename,
            mimeType: row.mimeType,
            width: row.width,
            height: row.height,
            durationSec: row.durationSec,
            fileSizeBytes: row.fileSizeBytes,
            reviewStatus: row.reviewStatus,
            data: null,
            createdAt: row.fileCreatedAt,
          },
        ],
      });
      if (validJobs.length === limit) break;
    }
  }

  return validJobs;
}
