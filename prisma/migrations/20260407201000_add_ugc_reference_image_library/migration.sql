CREATE TABLE "UgcReferenceImage" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "tikTokSourceId" TEXT,
    "originJobId" TEXT,
    "originGeneratedFileId" TEXT,
    "sourceVideoPathSnapshot" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sceneAnalysis" JSONB,
    "localPath" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UgcReferenceImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UgcReferenceImage_originGeneratedFileId_key" ON "UgcReferenceImage"("originGeneratedFileId");
CREATE INDEX "UgcReferenceImage_avatarId_createdAt_idx" ON "UgcReferenceImage"("avatarId", "createdAt");
CREATE INDEX "UgcReferenceImage_tikTokSourceId_idx" ON "UgcReferenceImage"("tikTokSourceId");
CREATE INDEX "UgcReferenceImage_createdAt_idx" ON "UgcReferenceImage"("createdAt");

ALTER TABLE "UgcReferenceImage"
    ADD CONSTRAINT "UgcReferenceImage_avatarId_fkey"
    FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UgcReferenceImage"
    ADD CONSTRAINT "UgcReferenceImage_tikTokSourceId_fkey"
    FOREIGN KEY ("tikTokSourceId") REFERENCES "TikTokSource"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
