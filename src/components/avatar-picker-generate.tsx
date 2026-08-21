"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { getModelsByType } from "@/lib/ai/models";
import { buildAvatarGenerationPrompt } from "@/lib/avatar-workflow";
import type { Avatar, AvatarCreatedHandoff, AvatarJobResult } from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { AvatarActionErrorNotice } from "@/components/avatar-picker-cards";

export function AvatarGeneratePanel({ onCreated, onBack }: AvatarCreatedHandoff) {
  const imageModels = getModelsByType("image");
  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState(() => imageModels[0]?.id ?? "nano-banana");
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genJob, setGenJob] = useState<AvatarJobResult | null>(null);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    <div className="space-y-4">
      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to avatars
      </button>

      {!genJobId && (
        <>
          <Textarea
            placeholder="Describe the person: age, gender, hair, skin tone, expression. e.g. 'Woman in her late 20s, dark wavy hair, warm smile, light skin'"
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value.slice(0, 500))}
            maxLength={500}
            className="min-h-[100px] resize-none bg-muted border-2 border-transparent focus:border-accent-green/30 focus:bg-card rounded-2xl p-4 text-sm transition-all"
          />
          <p className="text-[12px] text-muted-foreground">
            Quality modifiers (studio lighting, clean background, etc.) are added automatically.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Model
            </label>
            <div className="flex flex-wrap gap-2">
              {imageModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGenModel(m.id)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                    genModel === m.id
                      ? "border-accent-green bg-accent-green/10 text-accent-green"
                      : "border-border text-muted-foreground hover:border-accent-green/50"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!genPrompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-[0.93] disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            Generate Avatar
          </button>
        </>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
          <p className="text-sm font-medium">Generating avatar...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      )}

      {isFailed && (
        <div className="flex min-w-0 flex-col items-center justify-center gap-3 py-8">
          <p className="min-w-0 max-w-full break-words text-center text-sm text-destructive [overflow-wrap:anywhere]">Generation failed{genJob?.error ? `: ${genJob.error}` : ""}</p>
          <button
            type="button"
            onClick={() => setGenJobId(null)}
            className="text-sm text-accent-green hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {isCompleted && genJob && (
        <div className="space-y-4">
          <div className="relative aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-accent-green">
            <img
              src={`/api/files/${genJob.outputs[0].id}`}
              alt="Generated avatar"
              className="size-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGenJobId(null)}
              className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted flex items-center justify-center gap-2"
            >
              <X className="size-4" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => handleSaveGenerated(genJob.outputs[0].id)}
              disabled={isSavingGenerated}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-[0.93] disabled:opacity-50"
            >
              {isSavingGenerated ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Use as Avatar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
