"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api/client";
import {
  consumeCloneHandoffQuery,
  isSupportedCloneReferenceFile,
  type CloneReferenceFileMetadata,
} from "@/lib/ugc-clone-handoff";
import { mergeRefImagePollUpdates } from "@/app/ugc-clone/clone-view-model";
import type {
  CloneSetupStep,
  RefImageEntry,
  RefJobStatus,
} from "@/components/clone/types";

export function useCloneRefImages({
  avatarId,
  fetchSavedReferences,
  referenceFileIdParam,
  setSubmitError,
  setSelectedSavedReferenceId,
  setSelectedCollectionAssetId,
  setActiveSetupStep,
}: {
  avatarId: string | null;
  fetchSavedReferences: (nextAvatarId: string) => Promise<void>;
  referenceFileIdParam: string | null;
  setSubmitError: (message: string | null) => void;
  setSelectedSavedReferenceId: (value: string | null) => void;
  setSelectedCollectionAssetId: (value: string | null) => void;
  setActiveSetupStep: (step: CloneSetupStep) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refImages, setRefImages] = useState<RefImageEntry[]>([]);
  const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
  const [refPrompt, setRefPrompt] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);
  useEffect(() => {
    refImagesRef.current = refImages;
  });

  useEffect(() => {
    if (!referenceFileIdParam) return;
    let cancelled = false;
    let shouldConsumeQuery = false;
    setActiveSetupStep("reference");

    void (async () => {
      try {
        const response = await fetch(
          `/api/ugc-clone/reference-files/${encodeURIComponent(referenceFileIdParam)}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          const message =
            body?.error ?? body?.message ?? "The handed-off reference could not be loaded.";
          if ([400, 404, 410, 415, 422].includes(response.status)) {
            shouldConsumeQuery = true;
            if (!cancelled) setSubmitError(message);
            return;
          }
          throw new Error(message);
        }
        const metadata = (await response.json()) as CloneReferenceFileMetadata;
        if (cancelled) return;

        if (!isSupportedCloneReferenceFile(metadata)) {
          shouldConsumeQuery = true;
          setSubmitError(
            "Only generated image outputs can be used as Clone references. Choose an image or generate a reference here."
          );
          return;
        }

        const currentEntries = refImagesRef.current;
        const existingIndex = currentEntries.findIndex(
          (entry) => entry.fileId === referenceFileIdParam
        );

        if (existingIndex >= 0) {
          setSelectedRefIndex(existingIndex);
        } else {
          setSelectedRefIndex(currentEntries.length);
          setRefImages((current) => [
            ...current,
            {
              jobId: `handoff-${referenceFileIdParam}`,
              fileId: referenceFileIdParam,
              prompt: "Imported from a PostForge generation",
              cost: 0,
              status: "completed",
            },
          ]);
        }

        setSelectedSavedReferenceId(null);
        setSelectedCollectionAssetId(null);
        setSubmitError(null);
        shouldConsumeQuery = true;
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "The handed-off reference could not be loaded."
          );
        }
      } finally {
        if (!cancelled && shouldConsumeQuery) {
          const nextQuery = consumeCloneHandoffQuery(
            searchParams.toString(),
            "referenceFileId"
          );
          router.replace(nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    referenceFileIdParam,
    router,
    searchParams,
    setActiveSetupStep,
    setSelectedCollectionAssetId,
    setSelectedSavedReferenceId,
    setSubmitError,
  ]);

  const pollGeneratingJobs = useCallback(async () => {
    const generating = refImagesRef.current.filter((r) => r.status === "generating");
    if (generating.length === 0) return;

    const updates = await Promise.allSettled(
      generating.map(async (entry) => {
        const job = await apiGet<RefJobStatus>(`/api/jobs/${entry.jobId}`);
        return { jobId: entry.jobId, job };
      })
    );

    setRefImages((prev) => mergeRefImagePollUpdates(prev, updates));

    if (avatarId) {
      void fetchSavedReferences(avatarId);
    }
  }, [avatarId, fetchSavedReferences]);

  useEffect(() => {
    const hasGenerating = refImages.some((r) => r.status === "generating");
    if (!hasGenerating) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(pollGeneratingJobs, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [refImages, pollGeneratingJobs]);

  return {
    refImages,
    setRefImages,
    refImagesRef,
    selectedRefIndex,
    setSelectedRefIndex,
    refPrompt,
    setRefPrompt,
  };
}
