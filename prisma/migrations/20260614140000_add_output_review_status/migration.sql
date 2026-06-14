ALTER TABLE "GeneratedFile"
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review';

CREATE INDEX "GeneratedFile_reviewStatus_idx" ON "GeneratedFile"("reviewStatus");
