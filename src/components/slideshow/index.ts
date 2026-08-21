export { SlideshowStudio } from "./slideshow-studio";
export { SlideshowEditor } from "./slideshow-editor";
export { SlidePreview, VisualTile } from "./slide-preview";
export {
  parseSlideshowViewMode,
  slideCoverImage,
  slideLayerCount,
  stepSlideIndex,
} from "./slideshow-view";
export type { SlideshowViewMode } from "./slideshow-view";
export {
  addSlideshowSlide,
  createAddedSlide,
  deleteSlideshowSlide,
  duplicateSlideshowSlide,
  MAX_SLIDESHOW_SLIDES,
  MIN_SLIDESHOW_SLIDES,
  moveSlideshowSlide,
  nextLocalSlideId,
  normalizeSlideshowSlides,
  kindForSlideIndex,
  reorderSlideshowSlides,
  setSlideshowCta,
  updateSlideshowSlide,
} from "./model";
export {
  createBlankSlideshowProject,
  createProjectFromTemplate,
  DEFAULT_SLIDESHOW_TEMPLATES,
} from "./fixtures";
export {
  deserializeSlideshowProject,
  fetchSlideshowProjects,
  persistSlideshowProject,
  serializeSlideshowProject,
} from "@/lib/slideshow/client";
export type * from "./types";
