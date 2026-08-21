"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionAssetRecord,
  type CollectionRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import { fetchIntegrations } from "@/lib/integrations-client";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import type { AutomationSourceFile } from "./automation-builder-preview";

export function useAutomationBuilderResources({
  editId,
  sourceFileId,
  setError,
}: {
  editId: string | null;
  sourceFileId: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [collectionAssets, setCollectionAssets] = useState<CollectionAssetRecord[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [loadedSourceFile, setLoadedSourceFile] = useState<AutomationSourceFile | null>(null);
  const [sourceFailedId, setSourceFailedId] = useState<string | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    PublicIntegrationStatus[]
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationRefreshKey, setIntegrationRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<CollectionFeatureRecord>("collections")
      .then(({ records }) => {
        if (!cancelled) {
          setCollections(records.filter(isCollectionRecord));
          setCollectionAssets(records.filter(isCollectionAssetRecord));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([]);
          setCollectionAssets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCollectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (!sourceFileId) return;
    const controller = new AbortController();
    fetch(`/api/files/${encodeURIComponent(sourceFileId)}/metadata`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source asset could not be found");
        return (await response.json()) as { file: AutomationSourceFile };
      })
      .then(({ file }) => {
        setLoadedSourceFile(file);
        setSourceFailedId(null);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setLoadedSourceFile(null);
        setSourceFailedId(sourceFileId);
        setError(
          cause instanceof Error
            ? cause.message
            : "Source asset could not be loaded"
        );
      });
    return () => controller.abort();
  }, [setError, sourceFileId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchIntegrations({ signal: controller.signal })
      .then(({ providers }) => setIntegrationStatuses(providers))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setIntegrationStatuses([]);
        setIntegrationsError(
          cause instanceof Error
            ? cause.message
            : "Unable to check social connections"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIntegrationsLoading(false);
      });
    return () => controller.abort();
  }, [integrationRefreshKey]);

  function refreshIntegrations() {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    setIntegrationRefreshKey((current) => current + 1);
  }

  return {
    collections,
    collectionAssets,
    collectionsLoading,
    sourceFile: sourceFileId ? loadedSourceFile : null,
    sourceFileLoading: Boolean(
      sourceFileId &&
        loadedSourceFile?.id !== sourceFileId &&
        sourceFailedId !== sourceFileId
    ),
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    refreshIntegrations,
  };
}
