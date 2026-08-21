import type { SlideshowProjectStatusValue } from "@/lib/slideshow/constants";

export const LIST_PREVIEW_SLIDE_COUNT = 3;

export type SlideshowProjectListItem = {
  id: string;
  clientId?: string;
  title: string;
  description?: string;
  status: SlideshowProjectStatusValue;
  revision: number;
  aspectRatio: string;
  slideCount: number;
  previewImageUrls: Array<string | null>;
  successfulExportCount: number;
  lastExportedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SlideshowProjectListPage = {
  projects: SlideshowProjectListItem[];
  total: number;
  limit: number;
  offset: number;
};
