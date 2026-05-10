import { prisma } from "@/lib/db";

const globalForCloneQueueSchema = globalThis as unknown as {
  __postforge_clone_queue_schema?: Promise<void>;
};

export async function ensureCloneQueueSchema(): Promise<void> {
  if (!globalForCloneQueueSchema.__postforge_clone_queue_schema) {
    globalForCloneQueueSchema.__postforge_clone_queue_schema = (async () => {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "GenerationJob"
          ADD COLUMN IF NOT EXISTS "queueStage" TEXT,
          ADD COLUMN IF NOT EXISTS "lockOwner" TEXT,
          ADD COLUMN IF NOT EXISTS "lockExpiresAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "lastPolledAt" TIMESTAMP(3)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "GenerationJob_status_queueStage_idx"
          ON "GenerationJob"("status", "queueStage")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "GenerationJob_lockExpiresAt_idx"
          ON "GenerationJob"("lockExpiresAt")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "GenerationJob_nextAttemptAt_idx"
          ON "GenerationJob"("nextAttemptAt")
      `);
    })();
  }

  await globalForCloneQueueSchema.__postforge_clone_queue_schema;
}

export async function setCloneQueueStage(
  jobId: string,
  stage: "queued" | "preparing" | "submitted" | "downloading" | "completed" | "failed"
): Promise<void> {
  await ensureCloneQueueSchema();
  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET "queueStage" = ${stage}
    WHERE "id" = ${jobId}
  `;
}

export async function markCloneJobPreparing(
  jobId: string,
  lockExpiresAt: Date
): Promise<void> {
  await ensureCloneQueueSchema();
  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET
      "status" = 'processing',
      "queueStage" = 'preparing',
      "lockExpiresAt" = ${lockExpiresAt},
      "startedAt" = COALESCE("startedAt", NOW()),
      "error" = NULL
    WHERE "id" = ${jobId}
  `;
}

export async function markCloneJobSubmitted(
  jobId: string,
  requestId: string
): Promise<void> {
  await ensureCloneQueueSchema();
  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET
      "status" = 'processing',
      "queueStage" = 'submitted',
      "startedAt" = COALESCE("startedAt", NOW()),
      "falRequestId" = ${requestId},
      "lockOwner" = NULL,
      "lockExpiresAt" = NULL,
      "nextAttemptAt" = NULL
    WHERE "id" = ${jobId}
  `;
}

export async function clearCloneQueueLock(
  jobId: string,
  stage: "completed" | "failed"
): Promise<void> {
  await ensureCloneQueueSchema();
  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET
      "queueStage" = ${stage},
      "lockOwner" = NULL,
      "lockExpiresAt" = NULL,
      "nextAttemptAt" = NULL
    WHERE "id" = ${jobId}
  `;
}
