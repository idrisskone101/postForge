ALTER TABLE "Avatar"
  ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN "provenance" JSONB;

CREATE INDEX "Avatar_origin_idx" ON "Avatar"("origin");
