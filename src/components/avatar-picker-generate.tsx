"use client";

import { useEffect, useId, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { getModelsByType } from "@/lib/ai/models";
import { buildAvatarGenerationPrompt } from "@/lib/avatar-workflow";
import type { Avatar, AvatarCreatedHandoff, AvatarJobResult } from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import { Button, Chip, Icon, Meter } from "@/components/workbench";
import { AvatarActionErrorNotice } from "@/components/avatar-picker-cards";
import { AvatarPickerModeHead } from "@/components/avatar-picker-mode-head";

export function AvatarGeneratePanel({ onCreated, onBack }: AvatarCreatedHandoff) {
  const imageModels = getModelsByType("image");
  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState(() => imageModels[0]?.id ?? "nano-banana");
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genJob, setGenJob] = useState<AvatarJobResult | null>(null);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const promptId = useId();
  const modelLabelId = useId();

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;

    try {
      setActionError(null);
      const enhancedPrompt = buildAvatarGenerationPrompt(genPrompt);
      const result = await apiPost<{ id: string }>("/api/generate/images", {
        prompt: enhancedPrompt,
        model: genModel,
        aspectRatio: "1:1",
        numImages: 1,
      });
      setGenJobId(result.id);
    } catch (err) {
      console.error("Failed to start generation:", err);
      setActionError(userErrorMessage(err, "Failed to start avatar generation."));
    }
  };

  useEffect(() => {
    if (!genJobId) {
      setGenJob(null);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<AvatarJobResult>(`/api/jobs/${genJobId}`);
        if (!active) return;
        setActionError(null);
        setGenJob(result);
        if (result.status !== "completed" && result.status !== "failed") {
          timeoutId = setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error("Failed to poll job:", err);
        setActionError(
          userErrorMessage(err, "Avatar generation status is temporarily unavailable.")
        );
        if (active) {
          timeoutId = setTimeout(poll, 5000);
        }
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [genJobId]);

  const handleSaveGenerated = async (fileId: string) => {
    setIsSavingGenerated(true);
    setActionError(null);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: genPrompt.slice(0, 40) || "AI Avatar",
      });
      onCreated(avatar);
    } catch (err) {
      console.error("Failed to save avatar:", err);
      setActionError(userErrorMessage(err, "Generated avatar could not be saved."));
    } finally {
      setIsSavingGenerated(false);
    }
  };

  const isGenerating = Boolean(
    genJobId && (!genJob || genJob.status === "queued" || genJob.status === "processing")
  );
  const isCompleted = genJob?.status === "completed" && genJob.outputs.length > 0;
  const isFailed = genJob?.status === "failed";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AvatarPickerModeHead title="Generate an avatar" onBack={onBack} />
      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {!genJobId && (
        <>
          <div className="wb-field">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={promptId} className="wb-label">
                Describe the person
              </label>
              <span className="wb-mono text-fg-muted">{genPrompt.length} / 500</span>
            </div>
            <textarea
              id={promptId}
              className="wb-input resize-none"
              placeholder="Woman in her late 20s, dark wavy hair, warm smile, light skin"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value.slice(0, 500))}
              maxLength={500}
            />
          </div>

          <div className="wb-field">
            <span id={modelLabelId} className="wb-label">
              Model
            </span>
            <div role="group" aria-labelledby={modelLabelId} className="flex flex-wrap gap-2">
              {imageModels.map((m) => (
                <Chip key={m.id} chosen={genModel === m.id} onClick={() => setGenModel(m.id)}>
                  {m.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="strong" onClick={handleGenerate} disabled={!genPrompt.trim()}>
              <Icon name="generate" size={16} />
              Generate avatar
            </Button>
          </div>
        </>
      )}

      {isGenerating && (
        <div role="status" className="flex flex-col gap-2.5 rounded-lg bg-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-semibold leading-[18px] text-fg">Generating avatar</span>
            <span className="text-[13px] leading-4 text-fg-secondary">{jobStageLabel(genJob)}</span>
          </div>
          <Meter label={`Avatar generation, ${jobStageLabel(genJob).toLowerCase()}`} running className="flex-none" />
        </div>
      )}

      {isFailed && (
        <div role="alert" className="wb-notice items-start pr-2.5" data-tone="bad">
          <p className="min-w-0 flex-1 break-words pt-[7px] [overflow-wrap:anywhere]">
            <strong className="text-bad">Generation failed.</strong>
            {genJob?.error ? ` ${genJob.error}` : ""}
          </p>
          <Button variant="strong" size={32} onClick={() => setGenJobId(null)}>
            Try again
          </Button>
        </div>
      )}

      {isCompleted && genJob && (
        <div className="wb-fade-in flex flex-wrap items-end gap-4">
          <div className="wb-tile h-[240px] w-[180px] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${genJob.outputs[0].id}`} alt="Generated avatar" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setGenJobId(null)}>Regenerate</Button>
            <Button
              variant="strong"
              onClick={() => handleSaveGenerated(genJob.outputs[0].id)}
              disabled={isSavingGenerated}
            >
              {isSavingGenerated ? "Saving" : "Use as avatar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The stage the job itself reports. Before the first poll answers there is nothing to report but the start. */
function jobStageLabel(job: AvatarJobResult | null) {
  if (job?.status === "processing") return "Processing";
  if (job?.status === "queued") return "Queued";
  return "Starting";
}
