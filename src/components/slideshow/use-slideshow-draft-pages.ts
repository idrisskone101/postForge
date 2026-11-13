import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { fetchSlideshowProjectPage } from "@/lib/slideshow/list-client";
import type { SlideshowStatusCounts } from "@/lib/slideshow/list-types";

import type { SlideshowProjectListItem } from "./types";

const PAGE_SIZE = 20;

export function useSlideshowDraftPages(input: {
  apiBaseUrl: string;
  projects: SlideshowProjectListItem[];
  setProjects: Dispatch<SetStateAction<SlideshowProjectListItem[]>>;
  setProjectsError: Dispatch<SetStateAction<string | null>>;
}) {
  const { apiBaseUrl, projects, setProjects, setProjectsError } = input;
  const [reportedTotal, setReportedTotal] = useState<number | null>(null);
  const [statusCounts, setStatusCounts] = useState<SlideshowStatusCounts | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const reportTotals = useCallback(
    (total: number, counts: SlideshowStatusCounts | null) => {
      setReportedTotal(total);
      setStatusCounts(counts);
    },
    [],
  );
  const loaded = projects.length;
  const total = reportedTotal === null ? null : Math.max(reportedTotal, loaded);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchSlideshowProjectPage({
        apiBaseUrl,
        limit: PAGE_SIZE,
        offset: loaded,
      });
      setProjects((current) => {
        const known = new Set(current.map((project) => project.id));
        return [...current, ...page.projects.filter((project) => !known.has(project.id))];
      });
      reportTotals(page.total, page.statusCounts);
      setProjectsError(null);
    } catch (error) {
      setProjectsError(
        error instanceof Error ? error.message : "Could not load more slideshow drafts.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    reportTotals,
    pages: {
      loaded,
      total,
      statusCounts,
      hasMore: total === null ? loaded > 0 && loaded % PAGE_SIZE === 0 : loaded < total,
      loadingMore,
      onLoadMore: loadMore,
    },
  };
}

export type SlideshowDraftPages = ReturnType<typeof useSlideshowDraftPages>["pages"];
