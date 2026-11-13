"use client";

import { useEffect, useState } from "react";
import { Button, Panel, Skeleton, Toggle } from "@/components/workbench";
import {
  getDefaultVisionStoryModel,
  getStoryModel,
  STORY_MODELS,
} from "@/lib/ai/story-models";
import { cn } from "@/lib/utils";
import { PanelFoot, SettingsRow } from "./settings-row";

type CatalogModel = {
  id: string;
  name: string;
  type: "image" | "video";
  pricing: { unit: string; amount: number };
  capabilities: Record<string, unknown>;
  defaults: Record<string, unknown>;
};

type ModelsCatalogResponse = {
  models: CatalogModel[];
  defaults: { image: string; video: string };
  availability: {
    enabledModelIds: string[];
    defaultImageModelId: string | null;
    defaultVideoModelId: string | null;
    defaultIntelligenceModelId: string | null;
  } | null;
};

export function ModelsPanel({ onSaved }: { onSaved: (message: string) => void }) {
  const [catalog, setCatalog] = useState<ModelsCatalogResponse | null>(null);
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>([]);
  const [defaultImageModelId, setDefaultImageModelId] = useState("");
  const [defaultVideoModelId, setDefaultVideoModelId] = useState("");
  const [defaultIntelligenceModelId, setDefaultIntelligenceModelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSaved("Model availability saved. Picker defaults now follow these settings.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Model availability could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const group = (
    title: string,
    models: CatalogModel[],
    value: string,
    onChange: (id: string) => void
  ) => (
    <div className="flex flex-col gap-3 border-t border-hairline py-[18px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <span className="text-sm font-semibold leading-[18px] text-fg">{title}</span>
          <span className="wb-mono text-fg-muted">
            {models.filter((m) => enabledModelIds.includes(m.id)).length} / {models.length} enabled
          </span>
        </div>
        <select
          aria-label={`Default ${title.toLowerCase().replace(" models", "")} model`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="wb-input sm:w-[260px] sm:shrink-0"
        >
          <option value="">No default</option>
          {models
            .filter((model) => enabledModelIds.includes(model.id))
            .map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {models.map((model) => {
          const enabled = enabledModelIds.includes(model.id);
          return (
            <div
              key={model.id}
              data-model-availability-row={model.id}
              className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg bg-raised px-3.5 py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-sm font-semibold leading-[18px]", enabled ? "text-fg" : "text-fg-muted")}>
                  {model.name}
                </span>
                <span className={cn("wb-mono", enabled ? "text-fg-secondary" : "text-fg-muted")}>
                  {formatModelPricing(model.pricing)}
                </span>
              </span>
              {value === model.id && (
                <span className="wb-status-chip shrink-0" data-tone="live">Default</span>
              )}
              <Toggle label={`Enable ${model.name}`} checked={enabled} onCheckedChange={() => toggleModel(model.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Panel pad="wide" title="Available models" data-settings-models-panel className="gap-2" aria-busy={loading}>
      {error && (
        <p role="alert" className="wb-notice my-1 break-words [overflow-wrap:anywhere]" data-tone="bad">
          {error}
        </p>
      )}
      {loading ? (
        <div aria-hidden="true" className="flex flex-col">
          <div className="flex items-center gap-6 border-t border-hairline py-[18px]">
            <Skeleton className="h-4 flex-1" />
            <Skeleton shape="tile" className="h-[42px] w-[260px] max-sm:hidden" />
          </div>
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-3 border-t border-hairline py-[18px]">
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 flex-1" />
                <Skeleton shape="tile" className="h-[42px] w-[260px] max-sm:hidden" />
              </div>
              <Skeleton shape="tile" className="h-14 w-full sm:w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <SettingsRow
            label="Intelligence model"
            htmlFor="settings-intelligence-model"
            detail={
              selectedIntelligenceModel
                ? `${selectedIntelligenceModel.description}${
                    selectedIntelligenceModel.vision !== true && visionFallbackModel
                      ? ` Reference image analysis will use ${visionFallbackModel.name} because ${selectedIntelligenceModel.name} cannot read images.`
                      : ""
                  }`
                : undefined
            }
          >
            <select
              id="settings-intelligence-model"
              aria-label="Default intelligence model"
              value={defaultIntelligenceModelId}
              onChange={(event) => setDefaultIntelligenceModelId(event.target.value)}
              className="wb-input sm:w-[260px] sm:shrink-0"
            >
              {STORY_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.vision ? `${model.name}, vision` : model.name}
                </option>
              ))}
            </select>
          </SettingsRow>
          {group("Image models", imageModels, defaultImageModelId, setDefaultImageModelId)}
          {group("Video models", videoModels, defaultVideoModelId, setDefaultVideoModelId)}
        </div>
      )}
      <PanelFoot>
        <Button variant="primary" size={40} onClick={() => void handleSave()} disabled={saving || !catalog}>
          {saving ? "Saving" : "Save model settings"}
        </Button>
      </PanelFoot>
    </Panel>
  );
}

function formatModelPricing(pricing: { unit: string; amount: number }): string {
  if (pricing.unit === "per_image") return `$${pricing.amount.toFixed(3)}/image`;
  if (pricing.unit === "per_clip") return `$${pricing.amount.toFixed(2)}/clip`;
  return `$${pricing.amount.toFixed(3)}/second`;
}
