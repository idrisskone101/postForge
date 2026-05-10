CREATE TABLE "AvatarIdentityPack" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "imageModel" TEXT NOT NULL DEFAULT 'nano-banana-2',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarIdentityPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvatarIdentityImage" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "localPath" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSizeBytes" INTEGER,
    "originalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvatarIdentityImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvatarIdentityPack_avatarId_createdAt_idx" ON "AvatarIdentityPack"("avatarId", "createdAt");
CREATE INDEX "AvatarIdentityPack_status_idx" ON "AvatarIdentityPack"("status");
CREATE UNIQUE INDEX "AvatarIdentityPack_avatarId_active_key"
    ON "AvatarIdentityPack"("avatarId")
    WHERE "status" IN ('queued', 'processing');
CREATE INDEX "AvatarIdentityImage_packId_idx" ON "AvatarIdentityImage"("packId");
CREATE UNIQUE INDEX "AvatarIdentityImage_packId_role_key" ON "AvatarIdentityImage"("packId", "role");

ALTER TABLE "AvatarIdentityPack"
    ADD CONSTRAINT "AvatarIdentityPack_avatarId_fkey"
    FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvatarIdentityImage"
    ADD CONSTRAINT "AvatarIdentityImage_packId_fkey"
    FOREIGN KEY ("packId") REFERENCES "AvatarIdentityPack"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
