"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Save,
  Settings2,
} from "lucide-react";
import {
  getDefaultVisionStoryModel,
  getStoryModel,
  STORY_MODELS,
} from "@/lib/ai/story-models";
import { cn } from "@/lib/utils";

type ModelsCatalogResponse = {
  models: Array<{
    id: string;
    name: string;
    type: "image" | "video";
    pricing: { unit: string; amount: number };
    capabilities: Record<string, unknown>;
    defaults: Record<string, unknown>;
  }>;
  defaults: { image: string; video: string };
  availability: {
    enabledModelIds: string[];
    defaultImageModelId: string | null;
    defaultVideoModelId: string | null;
    defaultIntelligenceModelId: string | null;
  } | null;
};

export function ModelsPanel() {
  const [catalog, setCatalog] = useState<ModelsCatalogResponse | null>(null);
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>([]);
  const [defaultImageModelId, setDefaultImageModelId] = useState("");
  const [defaultVideoModelId, setDefaultVideoModelId] = useState("");
  const [defaultIntelligenceModelId, setDefaultIntelligenceModelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) throw new Error("Model catalog could not be loaded.");
        const data = (await response.json()) as ModelsCatalogResponse;
        if (cancelled) return;
        setCatalog(data);
        setEnabledModelIds(
          data.availability?.enabledModelIds ??
            data.models.map((model) => model.id)
        );
        setDefaultImageModelId(
          data.availability?.defaultImageModelId ?? data.defaults.image
        );
        setDefaultVideoModelId(
          data.availability?.defaultVideoModelId ?? data.defaults.video
        );
        setDefaultIntelligenceModelId(
          data.availability?.defaultIntelligenceModelId ??
            STORY_MODELS[0]?.id ??
            ""
        );
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Model catalog could not be loaded."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const imageModels = catalog?.models.filter((model) => model.type === "image") ?? [];
  const videoModels = catalog?.models.filter((model) => model.type === "video") ?? [];
  const selectedIntelligenceModel =
    getStoryModel(defaultIntelligenceModelId) ?? STORY_MODELS[0];
  const visionFallbackModel = getDefaultVisionStoryModel();

  const toggleModel = (modelId: string) => {
    setEnabledModelIds((current) => {
      const next = current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId];
      if (!next.includes(defaultImageModelId)) setDefaultImageModelId("");
      if (!next.includes(defaultVideoModelId)) setDefaultVideoModelId("");
      return next;
    });
  };

  const handleSave = async () => {
    if (!catalog) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const nextImageDefault =
        defaultImageModelId && enabledModelIds.includes(defaultImageModelId)
          ? defaultImageModelId
          : null;
      const nextVideoDefault =
        defaultVideoModelId && enabledModelIds.includes(defaultVideoModelId)
          ? defaultVideoModelId
          : null;
      const response = await fetch("/api/settings/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: {
            enabledModelIds,
            defaultImageModelId: nextImageDefault,
            defaultVideoModelId: nextVideoDefault,
            defaultIntelligenceModelId: defaultIntelligenceModelId || null,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Model availability could not be saved.");
      }
      setNotice("Model availability saved. Picker defaults now follow these settings.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Model availability could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const modelRows = (models: ModelsCatalogResponse["models"]) =>
    models.map((model) => {
      const enabled = enabledModelIds.includes(model.id);
      const isDefault =
        model.type === "image"
          ? defaultImageModelId === model.id
          : defaultVideoModelId === model.id;
      return (
        <label
          key={model.id}
          data-model-availability-row={model.id}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
            enabled ? "border-border bg-white" : "border-border bg-card opacity-60"
          )}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => toggleModel(model.id)}
            aria-label={`Enable ${model.name}`}
            className="size-4 shrink-0 accent-[var(--pf-orange)]"
          />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[11px] text-foreground">{model.name}</b>
            <small className="mt-0.5 block truncate text-[12px] text-muted-foreground">
              {model.pricing.unit === "per_image"
                ? `$${model.pricing.amount.toFixed(3)}/image`
                : model.pricing.unit === "per_clip"
                  ? `$${model.pricing.amount.toFixed(2)}/clip`
                  : `$${model.pricing.amount.toFixed(3)}/second`}
            </small>
          </span>
          {isDefault && (
            <span className="rounded-full bg-[var(--pf-link)]/10 px-2 py-1 text-[11px] font-bold text-[var(--pf-link)]">
              DEFAULT
            </span>
          )}
        </label>
      );
    });

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[var(--pf-orange)]" />
      </div>
    );
  }

  return (
    <div data-settings-models-panel>
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <Settings2 className="size-4" />
      </span>
      <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">Available models</h2>
      <p className="mt-1 max-w-[620px] text-[11px] leading-4 text-muted-foreground">
        One central catalog powers the Generate, Clone, Slideshow, and automation surfaces. Disabled models disappear from every picker; the default model is used when a surface does not expose a picker.
      </p>

      {error && (
        <div role="alert" className="mt-4 flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-danger)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-link)]">
          <Check className="mt-0.5 size-3.5 shrink-0" /> {notice}
        </div>
      )}

      <div className="pf-card mt-6 max-w-[760px] space-y-5 p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold">Intelligence model</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                One Ollama Cloud model runs every reasoning feature: slideshow stories, prompt improvement, and reference analysis.
              </p>
            </div>
            <select
              aria-label="Default intelligence model"
              value={defaultIntelligenceModelId}
              onChange={(event) => setDefaultIntelligenceModelId(event.target.value)}
              className="h-9 max-w-[220px] rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
            >
              {STORY_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.vision ? `${model.name} · Vision` : model.name}
                </option>
              ))}
            </select>
          </div>
          {selectedIntelligenceModel && (
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {selectedIntelligenceModel.description}
              {selectedIntelligenceModel.vision !== true && visionFallbackModel
                ? ` Reference image analysis will use ${visionFallbackModel.name} because ${selectedIntelligenceModel.name} cannot read images.`
                : ""}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold">Image models</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {imageModels.length} in catalog · {imageModels.filter((m) => enabledModelIds.includes(m.id)).length} enabled
              </p>
            </div>
            <select
              aria-label="Default image model"
              value={defaultImageModelId}
              onChange={(event) => setDefaultImageModelId(event.target.value)}
              className="h-9 max-w-[220px] rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
            >
              <option value="">No default</option>
              {imageModels
                .filter((model) => enabledModelIds.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{modelRows(imageModels)}</div>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold">Video models</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {videoModels.length} in catalog · {videoModels.filter((m) => enabledModelIds.includes(m.id)).length} enabled
              </p>
            </div>
            <select
              aria-label="Default video model"
              value={defaultVideoModelId}
              onChange={(event) => setDefaultVideoModelId(event.target.value)}
              className="h-9 max-w-[220px] rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)]"
            >
              <option value="">No default</option>
              {videoModels
                .filter((model) => enabledModelIds.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{modelRows(videoModels)}</div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <button onClick={() => void handleSave()} disabled={saving} className="pf-button-primary">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save model settings
          </button>
        </div>
      </div>
    </div>
  );
}
