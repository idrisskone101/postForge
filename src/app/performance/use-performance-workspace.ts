"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchIntegrationPerformance,
  integrationAccountKey,
  syncIntegration,
  type IntegrationPerformanceResponse,
  type SocialProvider,
} from "@/lib/integrations-client";
import {
  parsePerformanceCsv,
  type PerformanceDataset,
} from "@/lib/performance/csv";
import {
  aggregatePerformanceSource,
  canAggregateConnectedProviders,
  connectedAccountName,
  csvPostToView,
  providerDisplayName,
  providerPostToView,
  type ConnectedAccountView,
} from "@/lib/performance/metrics";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";

const EMPTY_PROVIDER_PERFORMANCE: IntegrationPerformanceResponse = {
  providers: [],
  posts: [],
  lastUpdatedAt: null,
};

export function usePerformanceWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvDataset, setCsvDataset] = useState<PerformanceDataset | null>(null);
  const [providerData, setProviderData] = useState<IntegrationPerformanceResponse>(
    EMPTY_PROVIDER_PERFORMANCE
  );
  const [selectedSource, setSelectedSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const loadProviderData = useCallback(async () => {
    setProviderError(null);
    try {
      const response = await fetchIntegrationPerformance();
      setProviderData(response);
      return response;
    } catch (cause) {
      setProviderError(
        cause instanceof Error
          ? cause.message
          : "Unable to load connected account performance"
      );
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLocalError(null);
    await Promise.all([
      loadProviderData(),
      fetchWorkspaceFeature<PerformanceDataset>("connections")
        .then(({ records }) => {
          const saved = records.find(
            (record) => record.id === "performance-dataset" && record.source === "csv"
          );
          setCsvDataset(saved ?? null);
        })
        .catch((cause) => {
          setLocalError(
            cause instanceof Error ? cause.message : "Unable to load imported CSV data"
          );
        }),
    ]);
    setLoading(false);
  }, [loadProviderData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const connectedAccounts = useMemo<ConnectedAccountView[]>(
    () =>
      providerData.providers.flatMap((status) =>
        status.connected
          ? status.accounts.map((account) => ({
              provider: status.provider,
              status,
              account,
              sourceKey: integrationAccountKey(status.provider, account.account.id),
            }))
          : []
      ),
    [providerData.providers]
  );

  const sourceOptions = useMemo(() => {
    const options = connectedAccounts.map((account) => account.sourceKey);
    if (canAggregateConnectedProviders(connectedAccounts)) {
      options.unshift("all-connected");
    }
    if (csvDataset) options.push("csv");
    return options;
  }, [connectedAccounts, csvDataset]);

  const activeSource = sourceOptions.includes(selectedSource)
    ? selectedSource
    : sourceOptions[0] ?? "";

  const activeAccount = connectedAccounts.find(
    (account) => account.sourceKey === activeSource
  );
  const activeIsYouTube = activeAccount?.provider === "youtube";

  const sourcePosts = useMemo(() => {
    if (activeSource === "csv") {
      return (csvDataset?.posts ?? []).map(csvPostToView);
    }
    const connectedKeys = new Set(
      connectedAccounts.map((account) => account.sourceKey)
    );
    return providerData.posts
      .filter((post) => {
        const key = integrationAccountKey(post.provider, post.accountId);
        return activeSource === "all-connected"
          ? post.provider !== "youtube" && connectedKeys.has(key)
          : key === activeSource;
      })
      .map(providerPostToView);
  }, [activeSource, connectedAccounts, csvDataset, providerData.posts]);

  const posts = useMemo(() => {
    const threshold = Date.now() - range * 86_400_000;
    const query = search.trim().toLowerCase();
    return sourcePosts
      .filter((post) => {
        if (!post.publishedAt) return false;
        const publishedAt = new Date(post.publishedAt).valueOf();
        return Number.isFinite(publishedAt) && publishedAt >= threshold;
      })
      .filter((post) => post.title.toLowerCase().includes(query))
      .sort((a, b) => {
        if (activeIsYouTube) {
          return (
            new Date(b.publishedAt ?? 0).valueOf() -
            new Date(a.publishedAt ?? 0).valueOf()
          );
        }
        if (a.metrics.views === null && b.metrics.views === null) return 0;
        if (a.metrics.views === null) return 1;
        if (b.metrics.views === null) return -1;
        return b.metrics.views - a.metrics.views;
      });
  }, [activeIsYouTube, range, search, sourcePosts]);

  const excludedUnknownDates = sourcePosts.filter((post) => !post.publishedAt).length;
  const aggregates = useMemo(
    () => aggregatePerformanceSource(posts, activeAccount?.provider),
    [activeAccount?.provider, posts]
  );

  const accountAggregates = useMemo(
    () =>
      connectedAccounts.map((entry) => {
        const key = entry.sourceKey;
        const accountPosts = providerData.posts.filter(
          (post) => integrationAccountKey(post.provider, post.accountId) === key
        );
        return {
          ...entry,
          aggregate: aggregatePerformanceSource(
            accountPosts.map(providerPostToView),
            entry.provider
          ),
        };
      }),
    [connectedAccounts, providerData.posts]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1900);
  }

  async function importFile(file: File) {
    setImporting(true);
    setLocalError(null);
    try {
      const parsed = parsePerformanceCsv(await file.text());
      const next: PerformanceDataset = {
        id: "performance-dataset",
        source: "csv",
        accountLabel: file.name,
        importedAt: new Date().toISOString(),
        posts: parsed,
      };
      await saveWorkspaceFeature("connections", next);
      setCsvDataset(next);
      setSelectedSource("csv");
      notify(`${parsed.length} local CSV posts imported`);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Unable to import CSV");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const sample =
      "title,views,likes,comments,shares,saves,publishedAt\nMy post,12000,840,62,91,430,2026-08-01";
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "postforge-performance-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("CSV template downloaded");
  }

  async function clearCsvData() {
    if (!csvDataset) return;
    if (!window.confirm("Remove only the imported CSV dataset? Connected account data will remain available.")) return;
    try {
      await removeWorkspaceFeature("connections", "performance-dataset");
      setCsvDataset(null);
      notify("Imported CSV data removed");
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Unable to remove CSV data");
    }
  }

  async function syncAccounts(targets: ConnectedAccountView[]) {
    const unique = new Map<string, ConnectedAccountView>();
    for (const target of targets) {
      unique.set(
        `${target.provider}:${target.account.account.id}`,
        target
      );
    }
    if (unique.size === 0) return;
    setProviderError(null);
    const failures: string[] = [];
    try {
      for (const target of unique.values()) {
        setBusyProvider(target.provider);
        try {
          await syncIntegration(
            target.provider,
            target.account.account.id
          );
        } catch {
          failures.push(
            connectedAccountName(target.account) || providerDisplayName(target.provider)
          );
        }
      }
    } finally {
      await loadProviderData();
      setBusyProvider(null);
    }
    if (failures.length > 0) {
      setProviderError(
        `${failures.join(", ")} could not be synced. Other connected accounts were still attempted.`
      );
    } else {
      notify(
        unique.size === 1
          ? `${connectedAccountName([...unique.values()][0].account)} synced`
          : `${unique.size} connected accounts synced`
      );
    }
  }

  const syncTargets = useMemo(() => {
    if (activeSource === "all-connected") {
      return connectedAccounts.filter(
        (entry) =>
          entry.provider !== "youtube" &&
          entry.account.authorization.status === "healthy"
      );
    }
    return activeAccount &&
      activeAccount.account.authorization.status === "healthy"
      ? [activeAccount]
      : [];
  }, [activeAccount, activeSource, connectedAccounts]);

  return {
    inputRef,
    csvDataset,
    providerData,
    loading,
    importing,
    providerError,
    localError,
    busyProvider,
    range,
    view,
    search,
    toast,
    connectedAccounts,
    sourceOptions,
    activeSource,
    activeAccount,
    activeIsYouTube,
    sourcePosts,
    posts,
    excludedUnknownDates,
    aggregates,
    accountAggregates,
    syncTargets,
    setSelectedSource,
    setProviderError,
    setLocalError,
    setRange,
    setView,
    setSearch,
    importFile,
    downloadTemplate,
    clearCsvData,
    syncAccounts,
  };
}
