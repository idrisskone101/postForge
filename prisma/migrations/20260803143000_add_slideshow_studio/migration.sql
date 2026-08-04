-- CreateEnum
CREATE TYPE "SlideshowProjectStatus" AS ENUM ('draft', 'generating', 'ready', 'scheduled', 'published', 'exported', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "SlideshowSlideKind" AS ENUM ('hook', 'content', 'cta');

-- CreateEnum
CREATE TYPE "SlideshowAutomationStatus" AS ENUM ('paused', 'active', 'archived');

-- CreateTable
CREATE TABLE "SlideshowProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled slideshow',
    "description" TEXT,
    "status" "SlideshowProjectStatus" NOT NULL DEFAULT 'draft',
    "settings" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideshowProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlideshowSlide" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "SlideshowSlideKind" NOT NULL DEFAULT 'content',
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "generationJobId" TEXT,
    "generatedFileId" TEXT,
    "sourceImageId" TEXT,
    "content" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideshowSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlideshowAutomation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "status" "SlideshowAutomationStatus" NOT NULL DEFAULT 'paused',
    "schedule" JSONB NOT NULL,
    "contentSettings" JSONB NOT NULL,
    "publishSettings" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideshowAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlideshowImageCollection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "settings" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideshowImageCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlideshowImage" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "localPath" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "altText" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideshowImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlideshowProject_status_updatedAt_idx" ON "SlideshowProject"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SlideshowProject_createdAt_idx" ON "SlideshowProject"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlideshowSlide_projectId_position_key" ON "SlideshowSlide"("projectId", "position");

-- CreateIndex
CREATE INDEX "SlideshowSlide_projectId_kind_idx" ON "SlideshowSlide"("projectId", "kind");

-- CreateIndex
CREATE INDEX "SlideshowSlide_generationJobId_idx" ON "SlideshowSlide"("generationJobId");

-- CreateIndex
CREATE INDEX "SlideshowSlide_generatedFileId_idx" ON "SlideshowSlide"("generatedFileId");

-- CreateIndex
CREATE INDEX "SlideshowSlide_sourceImageId_idx" ON "SlideshowSlide"("sourceImageId");

-- CreateIndex
CREATE INDEX "SlideshowAutomation_status_nextRunAt_idx" ON "SlideshowAutomation"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "SlideshowAutomation_projectId_idx" ON "SlideshowAutomation"("projectId");

-- CreateIndex
CREATE INDEX "SlideshowAutomation_updatedAt_idx" ON "SlideshowAutomation"("updatedAt");

-- CreateIndex
CREATE INDEX "SlideshowImageCollection_updatedAt_idx" ON "SlideshowImageCollection"("updatedAt");

-- CreateIndex
CREATE INDEX "SlideshowImageCollection_source_idx" ON "SlideshowImageCollection"("source");

-- CreateIndex
CREATE UNIQUE INDEX "SlideshowImage_collectionId_position_key" ON "SlideshowImage"("collectionId", "position");

-- CreateIndex
CREATE INDEX "SlideshowImage_collectionId_createdAt_idx" ON "SlideshowImage"("collectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SlideshowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_generatedFileId_fkey" FOREIGN KEY ("generatedFileId") REFERENCES "GeneratedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowSlide" ADD CONSTRAINT "SlideshowSlide_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "SlideshowImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowAutomation" ADD CONSTRAINT "SlideshowAutomation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SlideshowProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideshowImage" ADD CONSTRAINT "SlideshowImage_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SlideshowImageCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
