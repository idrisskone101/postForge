"use client";

import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonClass } from "@/components/workbench/button";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/workbench/icon";
import { Segmented } from "@/components/workbench/segmented";
import type { GalleryView } from "@/components/gallery/types";
import {
  filterOptions,
  reviewFilters,
  type GallerySortOrder,
  type GalleryTypeFilter,
  type ReviewFilter,
} from "./gallery-models";
import type { GalleryWorkspace } from "./use-gallery-workspace";

export function GalleryToolbar({
  workspace,
  dock,
}: {
  workspace: GalleryWorkspace;
  /** The bulk dock. It lies over the reserved count row, so the grid below never moves on select. */
  dock: ReactNode;
}) {
  const {
    reviewFilter,
    typeFilter,
    sortOrder,
    view,
    query,
    reviewCounts,
    countLabel,
    setReviewFilter,
    setTypeFilter,
    setSortOrder,
    setView,
    setQuery,
    setSelectedIds,
    replaceRouteFilters,
    selectionCount,
  } = workspace;
  const selecting = selectionCount > 0;

  const chooseReview = (value: ReviewFilter) => {
    setReviewFilter(value);
    setSelectedIds(new Set());
    replaceRouteFilters({ reviewStatus: value });
  };
  const chooseType = (value: GalleryTypeFilter) => {
    setTypeFilter(value);
    replaceRouteFilters({ type: value });
  };
  const chooseSort = (value: GallerySortOrder) => {
    setSortOrder(value);
    replaceRouteFilters({ sort: value });
  };

  return (
    <div data-gallery-toolbar="true" className="contents">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label
          data-gallery-search="true"
          className="wb-input-wrap min-w-0 flex-[1_1_220px]"
          data-size="36"
        >
          <Icon name="search" size={15} className="shrink-0 text-fg-muted" />
          <span className="sr-only">Search gallery</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIds(new Set());
            }}
            placeholder="Search gallery"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-4 text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        <Segmented
          label="Media type"
          value={typeFilter}
          onChange={chooseType}
          options={filterOptions}
          className="max-sm:w-full max-sm:[&>.wb-segment]:flex-1"
        />
        <div className="flex items-center gap-2">
          <SortMenu value={sortOrder} onChange={chooseSort} />
          <Segmented<GalleryView>
            label="Layout"
            value={view}
            onChange={setView}
            options={viewOptions}
          />
        </div>
      </div>
      <Segmented
        label="Review status"
        value={reviewFilter}
        onChange={chooseReview}
        options={reviewFilters.map((filter) => ({
          value: filter.value,
          label: filter.label,
          count: filter.value === "needs_review" ? reviewCounts.needs_review : undefined,
        }))}
        className="min-w-0 self-start [scrollbar-width:none]"
      />
      <div
        data-gallery-dock-row="true"
        data-selecting={selecting ? "true" : undefined}
        className={DOCK_ROW_CLASS}
      >
        <span data-gallery-count="true" className="wb-meta">
          {countLabel}
        </span>
        {dock}
      </div>
    </div>
  );
}

// Where the dock fits one row it sits in this row, which follows the scroll while a selection is active.
// The toolbar root is display: contents so the media panel, not the toolbar, bounds the sticky row.
const DOCK_ROW_CLASS = [
  "relative flex min-h-12 min-w-0 items-center pl-1",
  "lg:max-xl:data-[selecting=true]:sticky lg:max-xl:data-[selecting=true]:top-3 lg:max-xl:data-[selecting=true]:z-20",
  "min-[1440px]:data-[selecting=true]:sticky min-[1440px]:data-[selecting=true]:top-3 min-[1440px]:data-[selecting=true]:z-20",
].join(" ");

const viewOptions = [
  { value: "grid", label: <Icon name="grid" size={14} />, ariaLabel: "Grid view" },
  { value: "list", label: <Icon name="list" size={14} />, ariaLabel: "List view" },
] as const;

const sortLabels: Record<GallerySortOrder, string> = {
  newest: "Newest",
  oldest: "Oldest",
};

function SortMenu({
  value,
  onChange,
}: {
  value: GallerySortOrder;
  onChange: (value: GallerySortOrder) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonClass("quiet", 36), "pr-3 pl-3.5")}
        aria-label={`Sort: ${sortLabels[value]}`}
      >
        {sortLabels[value]}
        <Icon name="chevron-down" size={14} className="text-fg-secondary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="wb-float w-36 p-1">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as GallerySortOrder)}
        >
          {(["newest", "oldest"] as const).map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              closeOnClick
              className="h-9 rounded-full px-3 text-[13px] font-medium"
            >
              {sortLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
