"use client";

import { useMemo, useState } from "react";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import {
  filterPlaybooks,
  playbookCategories,
  playbookCategoryCounts,
  type PlaybookPickerState,
  type TemplateSort,
  type TemplateView,
} from "./playbook-model";
import { usePlaybookFavorites } from "./use-playbook-favorites";

type PlaybookChrome = {
  search: string;
  category: string;
  sort: TemplateSort;
  view: TemplateView;
  previewTemplateId: string;
  selectedTemplateId: string;
};

export function usePlaybookEntry({
  initialTemplateId,
  onClose,
}: {
  initialTemplateId: string;
  onClose: () => void;
}) {
  const resolvedId = AUTOMATION_TEMPLATES.some((template) => template.id === initialTemplateId)
    ? initialTemplateId
    : AUTOMATION_TEMPLATES[0].id;
  const [chrome, setChrome] = useState<PlaybookChrome>(() => ({
    search: "",
    category: "All",
    sort: "recommended",
    view: "grid",
    previewTemplateId: resolvedId,
    selectedTemplateId: resolvedId,
  }));
  const { favoriteTemplateIds, toggleFavorite } = usePlaybookFavorites();

  const categories = useMemo(() => playbookCategories(), []);
  const categoryCounts = useMemo(
    () => playbookCategoryCounts(favoriteTemplateIds),
    [favoriteTemplateIds]
  );
  const templates = useMemo(
    () =>
      filterPlaybooks({
        search: chrome.search,
        category: chrome.category,
        sort: chrome.sort,
        favoriteTemplateIds,
      }),
    [chrome.category, chrome.search, chrome.sort, favoriteTemplateIds]
  );

  const previewTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === chrome.previewTemplateId) ??
    AUTOMATION_TEMPLATES[0];
  const selectedTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === chrome.selectedTemplateId) ??
    AUTOMATION_TEMPLATES[0];

  function selectTemplate(templateId: string) {
    setChrome((current) => ({
      ...current,
      selectedTemplateId: templateId,
      previewTemplateId: templateId,
    }));
  }

  const playbookPicker: PlaybookPickerState = {
    templates,
    categories,
    categoryCounts,
    category: chrome.category,
    onCategoryChange: (category) => setChrome((current) => ({ ...current, category })),
    search: chrome.search,
    onSearchChange: (search) => setChrome((current) => ({ ...current, search })),
    sort: chrome.sort,
    onSortChange: (sort) => setChrome((current) => ({ ...current, sort })),
    view: chrome.view,
    onViewChange: (view) => setChrome((current) => ({ ...current, view })),
    favorites: favoriteTemplateIds,
    onToggleFavorite: toggleFavorite,
    previewTemplate,
    onPreview: (previewTemplateId) =>
      setChrome((current) => ({ ...current, previewTemplateId })),
    selectedTemplateId: chrome.selectedTemplateId,
    onSelect: selectTemplate,
    onBuildFromScratch: () => selectTemplate("custom"),
    onClose,
  };

  return {
    playbookPicker,
    selectedTemplate,
    selectTemplate,
    selectedTemplateId: chrome.selectedTemplateId,
  };
}
