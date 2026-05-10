-- Add durable queue/worker metadata for UGC clone and future generation jobs.
ALTER TABLE "GenerationJob" ADD COLUMN "queueStage" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "lockOwner" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "lockExpiresAt" TIMESTAMP(3);
ALTER TABLE "GenerationJob" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GenerationJob" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
ALTER TABLE "GenerationJob" ADD COLUMN "lastPolledAt" TIMESTAMP(3);

CREATE INDEX "GenerationJob_status_queueStage_idx" ON "GenerationJob"("status", "queueStage");
CREATE INDEX "GenerationJob_lockExpiresAt_idx" ON "GenerationJob"("lockExpiresAt");
CREATE INDEX "GenerationJob_nextAttemptAt_idx" ON "GenerationJob"("nextAttemptAt");
