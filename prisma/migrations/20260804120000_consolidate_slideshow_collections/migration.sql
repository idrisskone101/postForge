-- Consolidate slideshow image collections into the platform collections
-- (workspace feature store). Slideshow slides keep sourceImageId as a soft,
-- unconstrained reference to a platform collection asset id.

ALTER TABLE "SlideshowSlide" DROP CONSTRAINT IF EXISTS "SlideshowSlide_sourceImageId_fkey";

DROP TABLE IF EXISTS "SlideshowImage";
DROP TABLE IF EXISTS "SlideshowImageCollection";
