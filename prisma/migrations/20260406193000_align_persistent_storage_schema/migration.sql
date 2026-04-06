CREATE TABLE IF NOT EXISTS "TikTokSource" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "localPath" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSizeBytes" INTEGER,
    "thumbnailPath" TEXT,
    "data" BYTEA,
    "thumbnailData" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokSource_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GeneratedFile"
    ADD COLUMN IF NOT EXISTS "data" BYTEA;

ALTER TABLE "GeneratedFile"
    ALTER COLUMN "localPath" SET DEFAULT '';

ALTER TABLE "Avatar"
    ADD COLUMN IF NOT EXISTS "data" BYTEA;

ALTER TABLE "Avatar"
    ALTER COLUMN "localPath" SET DEFAULT '';

ALTER TABLE "TikTokSource"
    ADD COLUMN IF NOT EXISTS "data" BYTEA,
    ADD COLUMN IF NOT EXISTS "thumbnailData" BYTEA;

ALTER TABLE "TikTokSource"
    ALTER COLUMN "localPath" SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS "TikTokSource_originalUrl_key" ON "TikTokSource"("originalUrl");
CREATE INDEX IF NOT EXISTS "TikTokSource_createdAt_idx" ON "TikTokSource"("createdAt");

CREATE TABLE IF NOT EXISTS "StoredAsset" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredAsset_pkey" PRIMARY KEY ("key")
);
