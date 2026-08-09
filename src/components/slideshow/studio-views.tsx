"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileImage,
  Link2,
  LoaderCircle,
  Plus,
  ScanSearch,
  Search,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { PinterestImportDialog } from "@/components/pinterest-import-dialog";
import type { PinterestImportResult } from "@/lib/collections-client";
import { cn } from "@/lib/utils";

import { SlidePreview, VisualTile } from "./slide-preview";
import { STORY_MODELS } from "@/lib/ai/story-models";
import type {
  SlideshowProject,
  SlideshowSection,
  SlideshowTemplate,
} from "./types";

const CARD =
  "rounded-lg border border-border bg-white shadow-[var(--pf-shadow-2xs)]";
const CARD_HOVER =
  "transition-all duration-200 hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-md)]";
const SECONDARY_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-muted-foreground shadow-[var(--pf-shadow-2xs)] transition-all duration-150 hover:border-[var(--pf-border-strong)] hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
const INPUT =
  "w-full rounded-lg border border-border bg-card px-3 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10";
const FIELD_LABEL = "mb-1.5 block text-[12px] font-semibold text-muted-foreground";
const MAX_CREATOR_SLIDES = 20;

const sections: Array<{
  id: SlideshowSection;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "create", label: "Create", icon: Sparkles },
  { id: "drafts", label: "Drafts", icon: Archive },
];

export function StudioSectionNav({
  section,
  onChange,
  draftsCount,
}: {
  section: SlideshowSection;
  onChange: (section: SlideshowSection) => void;
  draftsCount?: number;
}) {
  return (
    <nav
      aria-label="Slideshow studio"
      className="sticky top-0 z-20 -mx-1 bg-[var(--pf-canvas)]/95 px-1 py-3 backdrop-blur"
    >
      <div
        className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-[var(--pf-active)] p-1"
        role="tablist"
      >
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => onChange(id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30",
              section === id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {id === "drafts" && draftsCount !== undefined ? (
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  section === id ? "text-[var(--pf-orange)]" : "text-muted-foreground",
                )}
              >
                {draftsCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SlideMini({
  slide,
  aspectRatio,
  phaseSettings,
  textSettings,
  label,
  fallbackText,
}: {
  slide: SlideshowProject["slides"][number];
  aspectRatio: SlideshowProject["aspectRatio"];
  phaseSettings: SlideshowProject["phaseSettings"][keyof SlideshowProject["phaseSettings"]];
  textSettings: SlideshowProject["textSettings"];
  label?: string;
  fallbackText: string;
}) {
  return (
    <div className="relative">
      <SlidePreview
        slide={{ ...slide, headline: slide.headline || fallbackText }}
        aspectRatio={aspectRatio}
        phaseSettings={phaseSettings}
        textSettings={textSettings}
        className="w-full rounded-lg"
      />
      {label ? (
        <span className="absolute left-1 top-1 z-10 rounded-full bg-black/45 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.08em] text-white/90">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function TemplateMinis({ template }: { template: SlideshowTemplate }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {template.visualKeys.map((visualKey, index) => {
        const slide = template.slides[index];
        return (
          <div
            key={`${visualKey}-${index}`}
            className="relative aspect-[9/16] overflow-hidden rounded-lg"
          >
            <VisualTile visualKey={visualKey} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-black/45 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.08em] text-white/90">
                Hook
              </span>
            ) : null}
            <p className="absolute inset-x-1.5 bottom-1.5 text-left text-[8px] font-semibold leading-[1.25] text-white">
              {index === 0
                ? template.hook
                : (slide?.headline ?? "What I would do again")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function StepChip({ n }: { n: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-[12px] font-bold text-muted-foreground">
      {n}
    </span>
  );
}

function ProjectStatusPill({ status }: { status: SlideshowProject["status"] }) {
  const map: Record<string, { cls: string; label: string; spinning?: boolean }> = {
    ready: { cls: "bg-accent-green/10 text-accent-green", label: "Ready" },
    exported: { cls: "bg-accent-green/10 text-accent-green", label: "Exported" },
    published: { cls: "bg-accent-green/10 text-accent-green", label: "Published" },
    generating: {
      cls: "bg-accent-blue/10 text-accent-blue",
      label: "Generating",
      spinning: true,
    },
    scheduled: { cls: "bg-accent-blue/10 text-accent-blue", label: "Scheduled" },
    failed: { cls: "bg-destructive/10 text-destructive", label: "Failed" },
    archived: { cls: "bg-[var(--pf-active)] text-muted-foreground", label: "Archived" },
    draft: { cls: "bg-[var(--pf-active)] text-muted-foreground", label: "Draft" },
  };
  const { cls, label, spinning } = map[status] ?? map.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12px] font-bold",
        cls,
      )}
    >
      {spinning ? <LoaderCircle className="size-2.5 animate-spin" /> : null}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export function CreateView({
  templates,
  generating,
  onGenerateStory,
  onCustom,
  onUseTemplate,
  onBrowseTemplates,
  onGenerateCreator,
  imageModels = [],
  selectedImageModel,
  onSelectImageModel,
  creatorGenerating = false,
}: {
  templates: SlideshowTemplate[];
  generating: boolean;
  onGenerateStory: (input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
    model?: string;
  }) => Promise<void>;
  onCustom: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
  onBrowseTemplates: () => void;
  onGenerateCreator: (input: {
    title: string;
    hook: string;
    slides: string[];
    template: unknown;
    collectionAssetIds: string[];
    directImageAssetIds: string[];
    model?: string;
    aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
  }) => Promise<void>;
  imageModels?: Array<{ id: string; name: string }>;
  selectedImageModel?: string | null;
  onSelectImageModel?: (id: string) => void;
  creatorGenerating?: boolean;
}) {
  const [mode, setMode] = useState<"one-idea" | "own-copy">("one-idea");
  const [idea, setIdea] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [language, setLanguage] = useState("English");
  const [model, setModel] = useState(STORY_MODELS[0]?.id ?? "");
  const [includeCta, setIncludeCta] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (idea.trim().length < 3 || generating) return;
    setError(null);
    try {
      await onGenerateStory({
        idea: idea.trim(),
        slideCount: Math.min(20, Math.max(1, Math.round(slideCount))),
        language: language.trim() || "English",
        includeCta,
        model,
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
    <div className="animate-content-enter">
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-[var(--pf-active)] p-1 sm:w-fit">
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
        <CreatorView
          imageModels={imageModels}
          selectedImageModel={selectedImageModel}
          onSelectImageModel={onSelectImageModel}
          generating={creatorGenerating}
          onGenerateCreator={onGenerateCreator}
        />
      ) : (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]">
        <section className={cn(CARD, "p-5")} aria-label="Generate a slideshow with AI">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                Start with one idea
              </h2>
              <p className="text-[11px] text-muted-foreground">
                PostForge writes the story. You review every slide.
              </p>
            </div>
          </div>

          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={3}
            placeholder="Example: the small reminder habit that made my mornings calmer"
            aria-label="What is the story about?"
            className={cn(INPUT, "mt-4 resize-none py-2.5 leading-5")}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
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
                  title={STORY_MODELS.find((m) => m.id === model)?.description}
                  className="h-8 max-w-[180px] appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium text-foreground outline-none focus:border-[var(--pf-orange)]"
                >
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

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
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

        <div className="grid gap-4">
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

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Templates
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Swap the idea, imagery, and voice. Keep the structure.
          </p>
        </div>
        <button type="button" onClick={onBrowseTemplates} className={SECONDARY_BTN}>
          All templates
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.slice(0, 6).map((template) => (
          <article key={template.id} className={cn(CARD, CARD_HOVER, "group overflow-hidden")}>
            <div className="p-3 pb-0">
              <TemplateMinis template={template} />
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {template.category} · {template.slides.length} slides
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(template)}
                className={cn(SECONDARY_BTN, "shrink-0 group-hover:border-[var(--pf-orange)] group-hover:text-[var(--pf-orange)]")}
              >
                Use format
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[6px] border border-border bg-[var(--pf-active)] p-3.5">
        <Workflow className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-4 text-muted-foreground">
          Scheduled slideshow runs are managed in Automations, and slide imagery lives in Collections, so every tool shares the same library.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bring your own copy (Slideshow Creator)                            */
/* ------------------------------------------------------------------ */

const SAMPLE_CREATOR_TEMPLATE = `{
  "aesthetic": {
    "core_vibe": "quiet luxury, masculine ambition, disciplined lifestyle, understated confidence",
    "mood": ["cinematic", "moody", "introspective", "aspirational", "slightly mysterious", "effortlessly cool"],
    "energy": "calm and self-assured rather than flashy or performative"
  },
  "visual_style": {
    "genre": "editorial lifestyle photography",
    "realism": "natural photographic realism",
    "finish": "premium but slightly raw",
    "inspiration": "high-end social media editorial mixed with candid documentary photography",
    "avoid": ["overly polished commercial advertising", "obvious influencer posing", "artificial HDR", "plastic-looking skin", "excessive saturation"]
  },
  "lighting": {
    "style": "dramatic natural or practical lighting",
    "exposure": "slightly underexposed",
    "contrast": "high contrast with deep shadows",
    "highlights": "soft, controlled highlights",
    "atmosphere": "dark surroundings with selective pools of light"
  },
  "color": {
    "palette": "muted and neutral",
    "dominant_tones": ["black", "charcoal", "deep gray", "warm beige", "subtle earth tones"],
    "saturation": "low to moderate",
    "temperature": "slightly warm or neutral"
  },
  "environment": {
    "feel": "modern, premium, private, urban or secluded",
    "examples": ["dark training spaces", "modern interiors", "city streets", "cars", "travel locations", "quiet workspaces"],
    "rule": "the environment should suggest lifestyle and ambition without becoming the entire subject"
  },
  "camera_feel": {
    "look": "full-frame editorial photography",
    "depth_of_field": "natural, usually moderate to shallow",
    "texture": "subtle film grain",
    "sharpness": "detailed but not digitally oversharpened"
  }
}`;

function CreatorView({
  imageModels,
  selectedImageModel,
  onSelectImageModel,
  generating,
  onGenerateCreator,
}: {
  imageModels?: Array<{ id: string; name: string }>;
  selectedImageModel?: string | null;
  onSelectImageModel?: (id: string) => void;
  generating: boolean;
  onGenerateCreator: (input: {
    title: string;
    hook: string;
    slides: string[];
    template: unknown;
    collectionAssetIds: string[];
    directImageAssetIds: string[];
    model?: string;
    aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [slideLines, setSlideLines] = useState<string[]>(["", "", "", ""]);
  const [templateText, setTemplateText] = useState(SAMPLE_CREATOR_TEMPLATE);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [referenceRefreshKey, setReferenceRefreshKey] = useState(0);
  const [preferredReferenceAssetIds, setPreferredReferenceAssetIds] = useState<string[]>([]);
  const [directPinterestAssets, setDirectPinterestAssets] = useState<
    PinterestImportResult["assets"]
  >([]);
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1" | "16:9">("9:16");
  const [error, setError] = useState<string | null>(null);

  const updateLine = (index: number, value: string) => {
    setSlideLines((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const parsedTemplate = useMemo(() => {
    try {
      const value = templateText.trim() ? JSON.parse(templateText) : null;
      setTemplateError(null);
      return value;
    } catch {
      setTemplateError("The template is not valid JSON.");
      return null;
    }
  }, [templateText]);

  const requestTemplateFromReferences = async (
    assetIds: string[],
    idempotencyKey?: string,
  ) => {
    const { requestSlideshowCreatorDerive } = await import("./api");
    const result = await requestSlideshowCreatorDerive("/api/slideshows", {
      collectionAssetIds: assetIds,
      idempotencyKey,
    });
    if (!result.template) {
      throw new Error(
        result.error || "Could not derive a template from those reference images.",
      );
    }
    setTemplateText(JSON.stringify(result.template, null, 2));
  };

  const deriveFromReferences = async () => {
    if (!referenceAssetIds.length || deriving) return;
    setDeriving(true);
    setError(null);
    setTemplateError(null);
    try {
      await requestTemplateFromReferences(referenceAssetIds);
    } catch (deriveError) {
      setTemplateError(
        deriveError instanceof Error
          ? deriveError.message
          : "Could not derive a template from those reference images.",
      );
    } finally {
      setDeriving(false);
    }
  };

  const createPinterestVibe = async (
    result: PinterestImportResult,
    idempotencyKey: string,
  ) => {
    if (!result.assetIds.length) {
      throw new Error("Pinterest imported no usable reference images.");
    }
    setReferenceAssetIds(result.assetIds);
    setPreferredReferenceAssetIds(result.assetIds);
    setReferenceRefreshKey((current) => current + 1);
    setTemplateError(null);
    try {
      await requestTemplateFromReferences(result.assetIds, idempotencyKey);
    } catch (deriveError) {
      const message =
        deriveError instanceof Error
          ? deriveError.message
          : "Could not create aesthetic JSON from those Pinterest images.";
      setTemplateError(message);
      throw new Error(message);
    }
  };

  const copyTemplateJson = async () => {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 1600);
    } catch {
      setTemplateError("Your browser blocked clipboard access. Select the JSON and copy it manually.");
    }
  };

  const submit = async () => {
    if (generating) return;
    setError(null);
    setTemplateError(null);
    if (!hook.trim()) {
      setError("Add a hook to start the slideshow.");
      return;
    }
    if (!parsedTemplate) {
      setTemplateError("Add a valid visual template before generating.");
      return;
    }
    const slides = slideLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!slides.length) {
      setError("Add at least one slide of copy.");
      return;
    }
    try {
      await onGenerateCreator({
        title: title.trim() || hook.trim(),
        hook: hook.trim(),
        slides,
        template: parsedTemplate,
        collectionAssetIds: referenceAssetIds,
        directImageAssetIds: directPinterestAssets.map((asset) => asset.id),
        model: selectedImageModel ?? "gpt-image-2",
        aspectRatio,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate the slideshow visuals.",
      );
    }
  };

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]">
      <section className={cn(CARD, "p-5")} aria-label="Bring your own copy">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
            <WandSparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Your copy, your visuals
            </h2>
            <p className="text-[11px] text-muted-foreground">
              PostForge keeps your copy verbatim and generates on-brand imagery for every slide.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className={cn(FIELD_LABEL)}>Slideshow title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled slideshow"
            className={cn(INPUT, "h-9")}
          />
        </label>

        <label className="mt-3 block">
          <span className={cn(FIELD_LABEL)}>Hook</span>
          <textarea
            value={hook}
            onChange={(event) => setHook(event.target.value)}
            rows={2}
            placeholder="The tension-led opening that earns the next swipe"
            className={cn(INPUT, "mt-1 resize-none py-2.5 leading-5")}
          />
        </label>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className={cn(FIELD_LABEL)}>Slide text</span>
            <button
              type="button"
              onClick={() => setSlideLines((current) => [...current, ""])}
              disabled={slideLines.length >= MAX_CREATOR_SLIDES}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-[var(--pf-orange)] transition hover:bg-[var(--pf-orange)]/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="size-3" /> Add slide
            </button>
          </div>
          {slideLines.length >= MAX_CREATOR_SLIDES ? (
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              Maximum {MAX_CREATOR_SLIDES} slides per slideshow.
            </p>
          ) : null}
          <div className="mt-2 space-y-2">
            {slideLines.map((line, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-md bg-[var(--pf-active)] font-mono text-[10px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <textarea
                  value={line}
                  onChange={(event) => updateLine(index, event.target.value)}
                  rows={1}
                  placeholder={`Text for slide ${index + 1}`}
                  className={cn(INPUT, "min-h-9 resize-y py-2 leading-4")}
                />
                {slideLines.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Remove slide"
                    onClick={() =>
                      setSlideLines((current) =>
                        current.filter((_, slideIndex) => slideIndex !== index),
                      )
                    }
                    className="mt-2 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className={cn(FIELD_LABEL)}>Aspect ratio</span>
            <span className="relative">
              <select
                value={aspectRatio}
                onChange={(event) =>
                  setAspectRatio(event.target.value as "9:16" | "4:5" | "1:1" | "16:9")
                }
                className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium outline-none focus:border-[var(--pf-orange)]"
              >
                {["9:16", "4:5", "1:1", "16:9"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            </span>
          </label>
          <label className="block">
            <span className={cn(FIELD_LABEL)}>Image model</span>
            <span className="relative">
              <select
                value={selectedImageModel ?? "gpt-image-2"}
                onChange={(event) => onSelectImageModel?.(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium outline-none focus:border-[var(--pf-orange)]"
              >
                {((imageModels && imageModels.length ? imageModels : [{ id: "gpt-image-2", name: "GPT Image 2" }]) as Array<{ id: string; name: string }>).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            </span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={generating || !hook.trim()}
            className="pf-button-primary ml-auto h-10 px-5"
          >
            {generating ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <WandSparkles className="size-3.5" />
            )}
            {generating ? "Generating visuals..." : "Create & generate visuals"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
          {[
            ["01", "Paste a JSON visual template"],
            ["02", "Your copy stays exactly as written"],
            ["03", "GPT Image 2 generates on-brand visuals"],
          ].map(([n, label]) => (
            <span key={n} className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <StepChip n={n} />
              {label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4">
        <section className={cn(CARD, "p-5")} aria-label="Visual template">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
              <ScanSearch className="size-4" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">
                Visual template (JSON)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                The aesthetic contract that stays consistent across slides.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-foreground">Pinterest references</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Use images directly on slides or turn them into visual style JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPinterestOpen(true)}
              className={cn(SECONDARY_BTN, "shrink-0")}
            >
              <Link2 className="size-3.5" /> Search Pinterest
            </button>
          </div>

          {directPinterestAssets.length ? (
            <div className="mt-3 rounded-lg border border-border bg-[var(--pf-active)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {directPinterestAssets.length} direct slide image{directPinterestAssets.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    Assigned from slide 1 in selection order. Remaining slides are generated; extra images stay saved in Collections.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDirectPinterestAssets([])}
                  className="text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Remove from slides
                </button>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {directPinterestAssets.slice(0, 12).map((asset, index) => (
                  <span
                    key={asset.id}
                    className="relative aspect-[4/5] overflow-hidden rounded-lg bg-card"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.imageUrl} alt="" className="size-full object-cover" />
                    <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded-full bg-black/70 font-mono text-[11px] text-white">
                      {index + 1}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 block">
            <span className={cn(FIELD_LABEL)}>Saved reference images (optional)</span>
            <div className="mt-1">
              <CollectionReferencePicker
                selectedAssetIds={referenceAssetIds}
                onChange={setReferenceAssetIds}
                maxSelection={14}
                refreshKey={referenceRefreshKey}
                preferredAssetIds={preferredReferenceAssetIds}
              />
            </div>
            <button
              type="button"
              onClick={() => void deriveFromReferences()}
              disabled={!referenceAssetIds.length || deriving}
              className={cn(
                SECONDARY_BTN,
                "mt-2 w-full",
                referenceAssetIds.length ? "hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)]" : "",
              )}
            >
              {deriving ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <ScanSearch className="size-3.5" />
              )}
              {deriving ? "Deriving template..." : "Derive template from references"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={cn(FIELD_LABEL, "mb-0")}>Aesthetic JSON</span>
            <button
              type="button"
              onClick={() => void copyTemplateJson()}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-[var(--pf-active)] hover:text-foreground"
            >
              {copiedJson ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copiedJson ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <label className="block">
            <span className="sr-only">Aesthetic JSON</span>
            <textarea
              value={templateText}
              onChange={(event) => setTemplateText(event.target.value)}
              rows={14}
              spellCheck={false}
              className={cn(INPUT, "mt-1 resize-y font-mono text-[11px] leading-4")}
            />
          </label>

          {templateError ? (
            <p role="alert" className="mt-2 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
              {templateError}
            </p>
          ) : null}
        </section>
      </div>
    </div>
    <PinterestImportDialog
      open={pinterestOpen}
      onOpenChange={setPinterestOpen}
      workflow="slideshow"
      onUseDirect={(result) => {
        setDirectPinterestAssets(result.assets);
        setPreferredReferenceAssetIds(result.assetIds);
        setReferenceRefreshKey((current) => current + 1);
      }}
      onCreateVibe={createPinterestVibe}
    />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Template library dialog                                             */
/* ------------------------------------------------------------------ */

export function TemplateDialog({
  open,
  templates,
  onOpenChange,
  onCustom,
  onUseTemplate,
}: {
  open: boolean;
  templates: SlideshowTemplate[];
  onOpenChange: (open: boolean) => void;
  onCustom: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? templates.filter((template) =>
          [template.name, template.category, template.hook]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : templates;
  }, [query, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl! overflow-hidden rounded-lg border-border p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-14">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Template library
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Start from a proven format or a blank slideshow.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search formats"
                className={cn(INPUT, "h-9 pl-9")}
              />
            </div>
            <button type="button" onClick={onCustom} className="pf-button-primary">
              <Plus className="size-3.5" />
              Blank
            </button>
          </div>
        </div>
        <div className="max-h-[64vh] overflow-y-auto p-4">
          {visible.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((template) => (
                <article
                  key={template.id}
                  className={cn(CARD, CARD_HOVER, "flex items-center gap-3 p-3")}
                >
                  <div className="grid w-24 shrink-0 grid-cols-3 gap-0.5">
                    {template.visualKeys.map((visualKey, index) => (
                      <VisualTile
                        key={`${visualKey}-${index}`}
                        visualKey={visualKey}
                        className="aspect-[9/16] rounded-[4px]"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {template.category} · {template.slides.length} slides
                    </p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{template.hook}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    className={cn(SECONDARY_BTN, "shrink-0")}
                  >
                    Use
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-[6px] border border-dashed border-[var(--pf-border-strong)] text-center">
              <div>
                <Search className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-2 text-[12px] font-semibold text-foreground">No formats match</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Try a niche or a hook phrase.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Drafts                                                              */
/* ------------------------------------------------------------------ */

export function DraftsView({
  projects,
  loading,
  error,
  onOpen,
  onCreate,
}: {
  projects: SlideshowProject[];
  loading: boolean;
  error: string | null;
  onOpen: (project: SlideshowProject) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: projects.length };
    projects.forEach((project) => {
      base[project.status] = (base[project.status] ?? 0) + 1;
    });
    return base;
  }, [projects]);

  const visible = projects.filter((project) => {
    const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || project.status === status;
    return matchesQuery && matchesStatus;
  });

  const statusFilters: Array<{ id: string; label: string }> = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "ready", label: "Ready" },
    { id: "generating", label: "Generating" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div className="animate-content-enter">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[230px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts"
            className={cn(INPUT, "h-9 pl-9")}
          />
        </div>
        <div className="flex rounded-lg bg-[var(--pf-active)] p-1" role="tablist" aria-label="Filter drafts by status">
          {statusFilters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-all",
                status === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  status === id ? "text-[var(--pf-orange)]" : "text-muted-foreground",
                )}
              >
                {counts[id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-[6px] bg-destructive/10 p-4 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={cn(CARD, "overflow-hidden")}>
              <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                {Array.from({ length: 3 }).map((_, cell) => (
                  <div key={cell} className="aspect-[9/16] animate-pulse rounded-lg bg-[var(--pf-active)]" />
                ))}
              </div>
              <div className="space-y-2 p-4">
                <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--pf-active)]" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-[var(--pf-active)]" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <article key={project.id} className={cn(CARD, CARD_HOVER, "overflow-hidden")}>
              <button
                type="button"
                onClick={() => onOpen(project)}
                className="block w-full text-left"
                aria-label={`Open ${project.title}`}
              >
                <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                  {project.slides.slice(0, 3).map((slide, index) => (
                    <SlideMini
                      key={slide.id}
                      slide={slide}
                      aspectRatio={project.aspectRatio}
                      phaseSettings={project.phaseSettings[slide.role]}
                      textSettings={project.textSettings}
                      label={index === 0 ? `${project.slides.length} slides` : undefined}
                      fallbackText="Untitled slide"
                    />
                  ))}
                </div>
              </button>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <ProjectStatusPill status={project.status} />
                  {project.successfulExportCount ? (
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {project.successfulExportCount} export{project.successfulExportCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-[1.3] text-foreground">
                  {project.title}
                </p>
                {project.status === "generating" ? (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--pf-active)]">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-blue" />
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      Rendering slide visuals. This draft updates when the jobs finish.
                    </p>
                  </div>
                ) : null}
                {project.status === "failed" ? (
                  <div className="mt-3 rounded-lg bg-destructive/10 p-2.5">
                    <p className="text-[12px] leading-4 text-destructive">
                      An image job failed while rendering this draft. Open it to retry the failed slide.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpen(project)}
                      className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg bg-destructive px-2.5 text-[12px] font-bold text-white transition hover:brightness-105 active:scale-[0.97]"
                    >
                      Open to retry
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[12px] text-muted-foreground">
                    Updated {new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(project)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-foreground transition hover:text-[var(--pf-orange)]"
                  >
                    Open
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pf-empty-stage relative mt-5 grid min-h-[320px] place-items-center overflow-hidden rounded-lg border border-dashed border-[var(--pf-border-strong)] p-8 text-center">
          <div className="relative">
            <span className="mx-auto grid size-11 place-items-center rounded-[6px] bg-white text-muted-foreground shadow-[var(--pf-shadow-2xs)]">
              <Archive className="size-5" />
            </span>
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              {projects.length ? "No drafts match these filters" : "No slideshow drafts yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[11px] leading-4 text-muted-foreground">
              {projects.length
                ? "Clear the search or pick another status to see more drafts."
                : "Start from an idea or a format. Autosaved work appears here."}
            </p>
            {!projects.length ? (
              <button type="button" onClick={onCreate} className="pf-button-primary mt-4">
                <Plus className="size-3.5" />
                New slideshow
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
