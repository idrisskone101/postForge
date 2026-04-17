DO $$
BEGIN
    CREATE TYPE "SocialPlatform" AS ENUM ('tiktok');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "InspirationSyncStatus" AS ENUM ('idle', 'syncing', 'ready', 'error');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InspirationAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'tiktok',
    "handleNormalized" TEXT NOT NULL,
    "handleDisplay" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "syncStatus" "InspirationSyncStatus" NOT NULL DEFAULT 'idle',
    "lastSyncAttemptAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspirationAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InspirationVideo" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'tiktok',
    "externalVideoId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "embedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "durationSec" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER,
    "likeCount" INTEGER,
    "commentCount" INTEGER,
    "shareCount" INTEGER,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourcePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspirationVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InspirationAccount_platform_handleNormalized_key"
ON "InspirationAccount"("platform", "handleNormalized");

CREATE INDEX IF NOT EXISTS "InspirationAccount_lastSyncedAt_idx"
ON "InspirationAccount"("lastSyncedAt");

CREATE INDEX IF NOT EXISTS "InspirationAccount_updatedAt_idx"
ON "InspirationAccount"("updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "InspirationVideo_platform_externalVideoId_key"
ON "InspirationVideo"("platform", "externalVideoId");

CREATE INDEX IF NOT EXISTS "InspirationVideo_accountId_publishedAt_idx"
ON "InspirationVideo"("accountId", "publishedAt");

CREATE INDEX IF NOT EXISTS "InspirationVideo_publishedAt_idx"
ON "InspirationVideo"("publishedAt");

CREATE INDEX IF NOT EXISTS "InspirationVideo_lastSeenAt_idx"
ON "InspirationVideo"("lastSeenAt");

DO $$
BEGIN
    ALTER TABLE "InspirationVideo"
        ADD CONSTRAINT "InspirationVideo_accountId_fkey"
        FOREIGN KEY ("accountId") REFERENCES "InspirationAccount"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
