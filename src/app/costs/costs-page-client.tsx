"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { costsHref } from "@/lib/costs/spend-period";
import type { CostsPageClientProps, SpendPageHandlers } from "./spend-models";
import { SpendPageContent } from "./spend-page-content";

export function CostsPageClient(dashboard: CostsPageClientProps) {
  const { period, logPage, search, model } = dashboard;
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(search);

  useEffect(() => {
    setQueryDraft(search);
  }, [search]);

  useEffect(() => {
    if (queryDraft.trim() === search.trim()) return;
    const timeout = window.setTimeout(() => {
      router.push(
        costsHref({ period, logPage: 0, search: queryDraft, model })
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [queryDraft, search, period, model, router]);

  const handlers: SpendPageHandlers = {
    onPeriodChange: (value) => {
      router.push(
        costsHref({ period: value, logPage: 0, search: queryDraft, model })
      );
    },
    onLogPageChange: (nextPage) => {
      router.push(costsHref({ period, logPage: nextPage, search, model }));
    },
    onSearchChange: setQueryDraft,
    onModelChange: (nextModel) => {
      router.push(
        costsHref({
          period,
          logPage: 0,
          search: queryDraft,
          model: nextModel,
        })
      );
    },
    onClearFilters: () => {
      setQueryDraft("");
      router.push(costsHref({ period, logPage: 0 }));
    },
    onExportCsv: async () => {
      const response = await fetch(`/api/costs/export?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to export cost logs");
      }
      const rowCount = Number(response.headers.get("X-Row-Count") ?? "0");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `postforge-spend-${period}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      return Number.isFinite(rowCount) ? rowCount : 0;
    },
  };

  return (
    <SpendPageContent
      dashboard={{ ...dashboard, search: queryDraft }}
      handlers={handlers}
    />
  );
}
