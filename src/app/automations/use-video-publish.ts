"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { AutomationPublication, AutomationRecord } from "@/lib/automations";
import type {
  ManualResolutionDialogState,
  PublishDialogState,
} from "./hub-types";
import { createPublishDialogState } from "./publish-dialog-model";
import {
  postPublishAttempt,
  postPublishRecover,
  postPublishResolve,
  postPublishStatus,
  requestPublishPreflight,
} from "./video-automation-api";

export function useVideoPublish({
  setRecords,
  setBusy,
  setMenu,
  setError,
  notify,
}: {
  setRecords: Dispatch<SetStateAction<AutomationRecord[]>>;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setMenu: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  notify: (message: string) => void;
}) {
  const [publishDialog, setPublishDialog] = useState<PublishDialogState | null>(
    null
  );
  const [manualResolutionDialog, setManualResolutionDialog] =
    useState<ManualResolutionDialogState | null>(null);

  function replacePublication(
    recordId: string,
    publication: AutomationPublication | null | undefined
  ) {
    if (!publication) return;
    setRecords((current) =>
      current.map((candidate) =>
        candidate.id === recordId ? { ...candidate, publication } : candidate
      )
    );
  }

  async function openPublishReview(record: AutomationRecord) {
    const assetId = record.content.sourceFileId;
    if (!assetId) {
      setError("Choose and approve a generated Gallery video before publishing");
      return;
    }
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const preflight = await requestPublishPreflight(record.id, assetId);
      setPublishDialog(createPublishDialogState(record, preflight));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to prepare the provider review"
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitPublication() {
    if (!publishDialog) return;
    const state = publishDialog;
    setPublishDialog({ ...state, error: null });
    setBusy(state.recordId);
    setError(null);
    try {
      const { ok, body } = await postPublishAttempt(state);
      replacePublication(state.recordId, body.publication);
      if (!ok || !body.publication) {
        setPublishDialog((current) =>
          current && current.recordId === state.recordId
            ? {
                ...current,
                retryFailed: body.publication?.status === "failed",
                consent: false,
                error:
                  body.error || "The provider did not accept the publication",
              }
            : current
        );
        return;
      }
      setPublishDialog(null);
      notify(
        body.publication.status === "published"
          ? "Provider confirmed the post is published"
          : "Provider accepted the video; processing status is saved"
      );
    } catch (cause) {
      setPublishDialog((current) =>
        current && current.recordId === state.recordId
          ? {
              ...current,
              error:
                cause instanceof Error
                  ? cause.message
                  : "The provider did not accept the publication",
            }
          : current
      );
    } finally {
      setBusy(null);
    }
  }

  async function recoverPendingPublication(record: AutomationRecord) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const { ok, body } = await postPublishRecover(record.id);
      replacePublication(record.id, body.publication);
      if (!ok || !body.publication) {
        throw new Error(body.error || "Unable to recover the interrupted attempt");
      }
      notify("Interrupted pre-provider attempt is ready for explicit review");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to recover the interrupted attempt"
      );
    } finally {
      setBusy(null);
    }
  }

  async function resolveUnknownPublication(
    record: AutomationRecord,
    resolution: "published" | "not_published"
  ) {
    setManualResolutionDialog((current) =>
      current ? { ...current, error: null } : current
    );
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const { ok, body } = await postPublishResolve(record.id, resolution);
      replacePublication(record.id, body.publication);
      if (!ok || !body.publication) {
        throw new Error(body.error || "Unable to save the verified outcome");
      }
      notify(
        resolution === "published"
          ? "Manual provider verification saved as published"
          : "Manual verification saved; explicit retry is unlocked"
      );
      setManualResolutionDialog(null);
    } catch (cause) {
      setManualResolutionDialog((current) =>
        current
          ? {
              ...current,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Unable to save the verified outcome",
            }
          : current
      );
    } finally {
      setBusy(null);
    }
  }

  async function refreshPublication(record: AutomationRecord) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const { ok, body } = await postPublishStatus(record.id);
      replacePublication(record.id, body.publication);
      if (!ok || !body.publication) {
        throw new Error(body.error || "Unable to refresh provider status");
      }
      notify(
        body.publication.status === "published"
          ? "Provider confirmed the post is published"
          : body.publication.status === "failed"
            ? "Provider reported that processing failed"
            : "Provider status refreshed"
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to refresh provider status"
      );
    } finally {
      setBusy(null);
    }
  }

  return {
    publishDialog,
    setPublishDialog,
    manualResolutionDialog,
    setManualResolutionDialog,
    openPublishReview,
    submitPublication,
    recoverPendingPublication,
    resolveUnknownPublication,
    refreshPublication,
  };
}
