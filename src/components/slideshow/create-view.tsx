"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ChevronDown,
  FileImage,
  LoaderCircle,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { getStoryModel, STORY_MODELS } from "@/lib/ai/story-models";
import { cn } from "@/lib/utils";

import { VisualTile } from "./slide-preview";
import {
  CARD,
  CARD_HOVER,
  INPUT,
  StepChip,
} from "./studio-ui";
import { useSlideshowHome } from "./slideshow-home-provider";

const CreatorView = dynamic(() =>
  import("./creator-view").then((mod) => ({ default: mod.CreatorView })),
);

const CreateTemplateGallery = dynamic(
  () =>
    import("./create-template-gallery").then((mod) => ({
      default: mod.CreateTemplateGallery,
    })),
  { ssr: true },
);

export function CreateView() {
  const home = useSlideshowHome();
  const {
    templates,
    generatingStory: generating,
    onGenerateStory,
    onCustom,
    onBrowseTemplates,
  } = home;
  const [mode, setMode] = useState<"one-idea" | "own-copy">("one-idea");
  const [idea, setIdea] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [language, setLanguage] = useState("English");
  const [model, setModel] = useState("");
  const [workspaceModelName, setWorkspaceModelName] = useState<string | null>(null);
  const [includeCta, setIncludeCta] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/settings/models");
        if (!response.ok) return;
        const data = (await response.json()) as {
          availability?: { defaultIntelligenceModelId?: string | null };
        };
        if (cancelled) return;
        const resolved = getStoryModel(data.availability?.defaultIntelligenceModelId);
        if (resolved) setWorkspaceModelName(resolved.name);
      } catch {
        // The picker still works; the workspace default label just stays generic.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (idea.trim().length < 3 || generating) return;
    setError(null);
    try {
      await onGenerateStory({
        idea: idea.trim(),
        slideCount: Math.min(20, Math.max(1, Math.round(slideCount))),
        language: language.trim() || "English",
        includeCta,
        model: model || undefined,
      });
      setIdea("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate this slideshow.",
      );
    }
  };

  return (
    <div data-slideshow-create="true">
      <div className="mb-4 flex h-10 items-center gap-1 overflow-hidden rounded-lg border border-border bg-[var(--pf-active)] p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setMode("one-idea")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition",
            mode === "one-idea"
              ? "bg-white text-foreground shadow-[var(--pf-shadow-xs)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" /> One idea
        </button>
        <button
          type="button"
          onClick={() => setMode("own-copy")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition",
            mode === "own-copy"
              ? "bg-white text-foreground shadow-[var(--pf-shadow-xs)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <WandSparkles className="size-3.5" /> Bring your own copy
        </button>
      </div>

      {mode === "own-copy" ? (
        <CreatorView />
      ) : (
      <div
        className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]"
        data-slideshow-idea-grid="true"
      >
        <section
          className={cn(CARD, "p-5")}
          data-slideshow-idea="true"
          aria-label="Generate a slideshow with AI"
        >
          <div
            className="flex h-8 items-center gap-2.5 overflow-hidden"
            data-slideshow-idea-title="true"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="max-w-[8rem] overflow-hidden whitespace-nowrap line-clamp-1 text-[10px] font-semibold tracking-[-0.02em] text-foreground">
                Start with one idea
              </h2>
              <p className="max-w-[8rem] overflow-hidden whitespace-nowrap line-clamp-1 text-[10px] text-muted-foreground">
                PostForge writes the story. You review every slide.
              </p>
            </div>
          </div>

          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={3}
            placeholder="A small morning habit"
            aria-label="What is the story about?"
            style={{ height: "5.125rem" }}
            className={cn(INPUT, "mt-4 h-[5.125rem] resize-none py-2.5 leading-5")}
          />

          <div
            className="mt-3 flex flex-wrap items-center gap-3 overflow-hidden"
            data-slideshow-idea-controls="true"
          >
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">Slides</span>
              <span className="flex items-center rounded-lg border border-border bg-card">
                <button
                  type="button"
                  aria-label="Fewer slides"
                  onClick={() => setSlideCount((count) => Math.max(1, count - 1))}
                  className="grid size-8 place-items-center text-muted-foreground transition hover:text-foreground"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono text-[13px] font-semibold tabular-nums text-foreground">
                  {slideCount}
                </span>
                <button
                  type="button"
                  aria-label="More slides"
                  onClick={() => setSlideCount((count) => Math.min(20, count + 1))}
                  className="grid size-8 place-items-center text-muted-foreground transition hover:text-foreground"
                >
                  +
                </button>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">Language</span>
              <span className="relative">
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="h-8 appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium text-foreground outline-none focus:border-[var(--pf-orange)]"
                >
                  {["English", "Spanish", "French", "German", "Portuguese", "Italian"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">Model</span>
              <span className="relative">
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  aria-label="Story model"
                  title={
                    model
                      ? STORY_MODELS.find((m) => m.id === model)?.description
                      : "Uses the intelligence model chosen in Settings"
                  }
                  className="h-8 max-w-[180px] appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium text-foreground outline-none focus:border-[var(--pf-orange)]"
                >
                  <option value="">
                    {workspaceModelName
                      ? `Workspace default (${workspaceModelName})`
                      : "Workspace default"}
                  </option>
                  {STORY_MODELS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={includeCta}
                onCheckedChange={setIncludeCta}
                aria-label="Include a CTA slide"
              />
              <span className="text-[11px] font-medium text-muted-foreground">CTA slide</span>
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={idea.trim().length < 3 || generating}
              data-slideshow-idea-submit="true"
              className="pf-button-primary ml-auto h-10 px-5"
            >
              {generating ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {generating ? "Writing slides..." : `Generate ${slideCount} slides`}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
              {error}
            </p>
          ) : null}

          <div
            className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 overflow-hidden border-t border-border pt-4"
            data-slideshow-idea-steps="true"
          >
            {[
              ["01", `Story written by ${STORY_MODELS.find((m) => m.id === model)?.name ?? "AI"}`],
              ["02", "Review and restyle slides"],
              ["03", "Export ZIP or MP4"],
            ].map(([n, label]) => (
              <span key={n} className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <StepChip n={n} />
                {label}
              </span>
            ))}
          </div>
        </section>

        <div className="grid gap-4" data-slideshow-idea-sidebar="true">
          <button
            type="button"
            onClick={onCustom}
            className={cn(CARD, CARD_HOVER, "group flex items-center gap-3.5 p-4 text-left")}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[6px] border border-dashed border-[var(--pf-border-strong)] text-muted-foreground transition-colors group-hover:border-[var(--pf-orange)] group-hover:text-[var(--pf-orange)]">
              <Plus className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-foreground">Blank slideshow</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                Empty canvas, full control of every slide.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </button>

          <button
            type="button"
            onClick={onBrowseTemplates}
            className={cn(CARD, CARD_HOVER, "group flex-1 p-4 text-left")}
          >
            <span className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-[6px] bg-[var(--pf-active)] text-muted-foreground transition-colors group-hover:bg-[var(--pf-orange)]/10 group-hover:text-[var(--pf-orange)]">
                <FileImage className="size-4.5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </span>
            <span className="mt-3 block text-[13px] font-semibold text-foreground">Template library</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              {templates.length} ready-to-use templates with hook, structure, and visual direction.
            </span>
            <span className="mt-3 grid grid-cols-3 gap-1">
              {(templates[0]?.visualKeys ?? ["coral-glow", "blue-studio", "mint-room"]).map(
                (visualKey, index) => (
                  <VisualTile
                    key={`${visualKey}-${index}`}
                    visualKey={visualKey}
                    className="h-10 rounded-[6px]"
                  />
                ),
              )}
            </span>
          </button>
        </div>
      </div>
      )}
      <CreateTemplateGallery />
    </div>
  );
}
