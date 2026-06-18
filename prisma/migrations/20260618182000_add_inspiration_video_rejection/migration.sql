ALTER TABLE "InspirationVideo"
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "InspirationVideo_rejectedAt_idx"
ON "InspirationVideo"("rejectedAt");
