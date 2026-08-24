"use client";

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { galleryLoadError, type GalleryPage, type GallerySortOrder, type GalleryTypeFilter, type ReviewFilter } from "./gallery-models";
import { fetchGalleryPage } from "./gallery-mutations";

type GalleryReloadOverrides = {
  type?: GalleryTypeFilter;
  sort?: GallerySortOrder;
  reviewStatus?: ReviewFilter;
};

export function useGalleryFilterReload({
  typeFilter,
  sortOrder,
  reviewFilter,
  setReviewFilter,
  setTypeFilter,
  setSortOrder,
  applyPage,
  setIsReloading,
  setLoadError,
  setSelectedIds,
  requestRef,
}: {
  typeFilter: GalleryTypeFilter;
  sortOrder: GallerySortOrder;
  reviewFilter: ReviewFilter;
  setReviewFilter: Dispatch<SetStateAction<ReviewFilter>>;
  setTypeFilter: Dispatch<SetStateAction<GalleryTypeFilter>>;
  setSortOrder: Dispatch<SetStateAction<GallerySortOrder>>;
  applyPage: (page: GalleryPage) => void;
  setIsReloading: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  requestRef: MutableRefObject<number>;
}) {
  const reloadGallery = useCallback(
    (overrides?: GalleryReloadOverrides) => {
      const requestId = ++requestRef.current;
      setIsReloading(true);
      setLoadError(null);
      setSelectedIds(new Set());

      void fetchGalleryPage({
        type: overrides?.type ?? typeFilter,
        sort: overrides?.sort ?? sortOrder,
        reviewStatus: overrides?.reviewStatus ?? reviewFilter,
      })
        .then((page) => {
          if (requestId !== requestRef.current) return;
          applyPage(page);
        })
        .catch((error) => {
          if (requestId !== requestRef.current) return;
          setLoadError(galleryLoadError(error));
        })
        .finally(() => {
          if (requestId === requestRef.current) setIsReloading(false);
        });
    },
    [
      applyPage,
      requestRef,
      reviewFilter,
      setIsReloading,
      setLoadError,
      setSelectedIds,
      sortOrder,
      typeFilter,
    ]
  );

  const setReviewFilterAndReload = useCallback(
    (filter: ReviewFilter) => {
      setReviewFilter(filter);
      reloadGallery({ reviewStatus: filter });
    },
    [reloadGallery, setReviewFilter]
  );

  const setTypeFilterAndReload = useCallback(
    (type: GalleryTypeFilter) => {
      setTypeFilter(type);
      reloadGallery({ type });
    },
    [reloadGallery, setTypeFilter]
  );

  const setSortOrderAndReload = useCallback(
    (sort: GallerySortOrder) => {
      setSortOrder(sort);
      reloadGallery({ sort });
    },
    [reloadGallery, setSortOrder]
  );

  return {
    setReviewFilterAndReload,
    setTypeFilterAndReload,
    setSortOrderAndReload,
  };
}
