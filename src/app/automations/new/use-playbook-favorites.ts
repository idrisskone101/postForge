"use client";

import { useEffect, useState } from "react";
import { AUTOMATION_TEMPLATES } from "@/lib/automations";
import { FAVORITES_STORAGE_KEY } from "./playbook-model";

export function usePlaybookFavorites() {
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setFavoriteTemplateIds(
          parsed.filter(
            (value): value is string =>
              typeof value === "string" &&
              AUTOMATION_TEMPLATES.some((template) => template.id === value)
          )
        );
      }
    } catch {
      // An unavailable or malformed local preference should never block the builder.
    } finally {
      setFavoritesHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!favoritesHydrated) return;
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteTemplateIds)
      );
    } catch {
      // Favorites can remain session-only when browser storage is unavailable.
    }
  }, [favoriteTemplateIds, favoritesHydrated]);

  function toggleFavorite(templateId: string) {
    setFavoriteTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((candidate) => candidate !== templateId)
        : [...current, templateId]
    );
  }

  return { favoriteTemplateIds, toggleFavorite };
}
