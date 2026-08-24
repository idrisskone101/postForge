"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  AvatarIdentityPack,
  SavedReference,
  SavedReferenceListPage,
} from "@/components/clone/types";

export function useCloneIdentity() {
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPack | null>(null);
  const [isStartingIdentityPack, setIsStartingIdentityPack] = useState(false);
  const [isGeneratingHairstyles, setIsGeneratingHairstyles] = useState(false);
  const [selectedHairstyleRole, setSelectedHairstyleRole] = useState<string | null>(null);
  const [identityPackError, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [savedReferencesNextCursor, setSavedReferencesNextCursor] = useState<string | null>(
    null
  );
  const [isLoadingSavedReferences, setIsLoadingSavedReferences] = useState(false);
  const [isLoadingMoreSavedReferences, setIsLoadingMoreSavedReferences] = useState(false);
  const [savedReferencesError, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(
    null
  );
  const [showAvatarReferences, setShowAvatarReferences] = useState(false);
  const [prevAvatarId, setPrevAvatarId] = useState<string | null>(avatarId);
  if (avatarId !== prevAvatarId) {
    setPrevAvatarId(avatarId);
    setShowAvatarReferences(false);
    setSelectedHairstyleRole(null);
    if (!avatarId) {
      setIdentityPack(null);
      setIdentityPackError(null);
      setIsStartingIdentityPack(false);
      setSavedReferences([]);
      setSavedReferencesNextCursor(null);
      setSavedReferencesError(null);
      setSelectedSavedReferenceId(null);
    }
  }

  const fetchSavedReferences = useCallback(async (nextAvatarId: string) => {
    setIsLoadingSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const page = await apiGet<SavedReferenceListPage>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(nextAvatarId)}`
      );
      setSavedReferences(page.items);
      setSavedReferencesNextCursor(page.nextCursor);
      setSelectedSavedReferenceId((current) =>
        current && page.items.some((reference) => reference.id === current)
          ? current
          : null
      );
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferences([]);
      setSavedReferencesNextCursor(null);
      setSelectedSavedReferenceId(null);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingSavedReferences(false);
    }
  }, []);

  const loadMoreSavedReferences = useCallback(async () => {
    if (!avatarId || !savedReferencesNextCursor || isLoadingMoreSavedReferences) {
      return;
    }

    setIsLoadingMoreSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const page = await apiGet<SavedReferenceListPage>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(avatarId)}&cursor=${encodeURIComponent(savedReferencesNextCursor)}`
      );
      setSavedReferences((current) => {
        const seen = new Set(current.map((reference) => reference.id));
        return [
          ...current,
          ...page.items.filter((reference) => !seen.has(reference.id)),
        ];
      });
      setSavedReferencesNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingMoreSavedReferences(false);
    }
  }, [avatarId, isLoadingMoreSavedReferences, savedReferencesNextCursor]);

  const fetchIdentityPack = useCallback(async (nextAvatarId: string) => {
    try {
      const pack = await apiGet<AvatarIdentityPack | null>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`
      );
      setIdentityPack(pack);
      setIdentityPackError(null);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load identity pack";
      setIdentityPack(null);
      setIdentityPackError(message);
      return null;
    }
  }, []);

  const startIdentityPack = useCallback(async (nextAvatarId: string, force = false) => {
    setIsStartingIdentityPack(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { force }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start identity pack";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsStartingIdentityPack(false);
    }
  }, []);

  const generateHairstyleVariants = useCallback(async (nextAvatarId: string) => {
    setIsGeneratingHairstyles(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { hairstyles: true }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate hairstyles";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsGeneratingHairstyles(false);
    }
  }, []);

  useEffect(() => {
    if (!avatarId) return;

    void fetchSavedReferences(avatarId);
    void (async () => {
      const pack = await fetchIdentityPack(avatarId);
      if (!pack) {
        await startIdentityPack(avatarId);
      }
    })();
  }, [avatarId, fetchIdentityPack, fetchSavedReferences, startIdentityPack]);

  useEffect(() => {
    const isPreparing =
      !!identityPack && ["queued", "processing"].includes(identityPack.status);
    const isBackfillingHairstyles = identityPack?.backfillingHairstyles === true;
    if (!avatarId || (!isPreparing && !isBackfillingHairstyles)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchIdentityPack(avatarId);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [avatarId, fetchIdentityPack, identityPack]);

  return {
    avatarId,
    setAvatarId,
    identityPack,
    isStartingIdentityPack,
    isGeneratingHairstyles,
    selectedHairstyleRole,
    setSelectedHairstyleRole,
    identityPackError,
    savedReferences,
    savedReferencesNextCursor,
    isLoadingSavedReferences,
    isLoadingMoreSavedReferences,
    savedReferencesError,
    selectedSavedReferenceId,
    setSelectedSavedReferenceId,
    showAvatarReferences,
    setShowAvatarReferences,
    fetchSavedReferences,
    loadMoreSavedReferences,
    startIdentityPack,
    generateHairstyleVariants,
  };
}
