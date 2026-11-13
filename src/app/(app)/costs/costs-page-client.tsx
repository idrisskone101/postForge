"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { costsHref } from "@/lib/costs/spend-period";
import type { CostsPageClientProps, SpendLoadState, SpendPageHandlers } from "./types";
import { SpendLoadError } from "./spend-load-error";
import { SpendPageContent } from "./spend-page-content";
import { SpendRangeControl } from "./spend-range-control";
import { SpendSkeleton } from "./spend-skeleton";

export function CostsPageClient(initial: CostsPageClientProps) {
  const { period, logPage, search, model } = initial;
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initial);
  const [prevSearch, setPrevSearch] = useState(search);
  const [queryDraft, setQueryDraft] = useState(search);
  const [load, setLoad] = useState<{ state: SpendLoadState; attempt: number }>({
    state: "loading",
    attempt: 0,
  });

  if (search !== prevSearch) {
    setPrevSearch(search);
    setQueryDraft(search);
  }

  useEffect(() => {
    const params = new URLSearchParams({ period });
    if (logPage > 0) params.set("logPage", String(logPage));
    if (search.trim()) params.set("q", search.trim());
    if (model) params.set("model", model);
    let cancelled = false;
    function loadDashboard() {
      fetch(`/api/costs/dashboard?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: CostsPageClientProps | null) => {
          if (cancelled) return;
          if (!payload) {
            setLoad((current) => (current.state === "ready" ? current : { ...current, state: "error" }));
            return;
          }
          setLoad((current) => (current.state === "ready" ? current : { ...current, state: "ready" }));
          setDashboard((current) =>
            current.totalCost === payload.totalCost &&
            current.currentPeriodCost === payload.currentPeriodCost &&
            current.totalJobs === payload.totalJobs &&
            current.logs.length === payload.logs.length &&
            current.period === payload.period &&
            current.search === payload.search &&
            current.model === payload.model &&
            current.logPage === payload.logPage
              ? current
              : payload
          );
        })
        .catch(() => {
          if (cancelled) return;
          setLoad((current) => (current.state === "ready" ? current : { ...current, state: "error" }));
        });
    }
    if (document.readyState === "complete") {
      loadDashboard();
    } else {
      window.addEventListener("load", loadDashboard);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("load", loadDashboard);
    };
  }, [period, logPage, search, model, load.attempt]);

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
    <>
      <SpendRangeControl period={period} onChange={handlers.onPeriodChange} />
      {load.state === "loading" ? <SpendSkeleton /> : null}
      {load.state === "error" ? (
        <SpendLoadError
          onRetry={() => setLoad((current) => ({ state: "loading", attempt: current.attempt + 1 }))}
        />
      ) : null}
      {load.state === "ready" ? (
        <SpendPageContent dashboard={{ ...dashboard, search: queryDraft }} handlers={handlers} />
      ) : null}
    </>
  );
}
