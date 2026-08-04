"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  FileImage,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
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
import { cn } from "@/lib/utils";

import { SlidePreview, VisualTile } from "./slide-preview";
import type {
  SlideshowProject,
  SlideshowSection,
  SlideshowTemplate,
} from "./types";

const CARD =
  "rounded-[13px] border border-[#DADBD2] bg-white shadow-[var(--pf-shadow-xs)]";
const CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-px hover:border-[#BFC0B9] hover:shadow-[var(--pf-shadow-md)]";
const SECONDARY_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-[#DADBD2] bg-white px-3 text-[11px] font-semibold text-[#666762] shadow-[var(--pf-shadow-2xs)] transition-all duration-150 hover:border-[#BFC0B9] hover:text-[#30312E] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
const INPUT =
  "w-full rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA] px-3 text-[12px] text-[#30312E] outline-none transition placeholder:text-[#969792] focus:border-[#FF4A20] focus:ring-2 focus:ring-[#FF4A20]/10";

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
      className="sticky top-0 z-20 -mx-1 bg-[#F3F4EF]/95 px-1 py-3 backdrop-blur"
    >
      <div
        className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[9px] bg-[#F0F1EB] p-1"
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
              "flex h-8 shrink-0 items-center gap-1.5 rounded-[7px] px-3 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4A20]/30",
              section === id
                ? "bg-white text-[#232323] shadow-sm"
                : "text-[#777873] hover:text-[#30312E]",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {id === "drafts" && draftsCount !== undefined ? (
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums",
                  section === id ? "text-[#FF4A20]" : "text-[#969792]",
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
        className="w-full rounded-[7px]"
      />
      {label ? (
        <span className="absolute left-1 top-1 z-10 rounded-full bg-black/45 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-white/90">
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
            className="relative aspect-[9/16] overflow-hidden rounded-[7px]"
          >
            <VisualTile visualKey={visualKey} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-black/45 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-white/90">
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
    <span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-[#F0F1EB] text-[10px] font-bold text-[#777873]">
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
    archived: { cls: "bg-[#F0F1EB] text-[#777873]", label: "Archived" },
    draft: { cls: "bg-[#F0F1EB] text-[#777873]", label: "Draft" },
  };
  const { cls, label, spinning } = map[status] ?? map.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-bold",
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
}: {
  templates: SlideshowTemplate[];
  generating: boolean;
  onGenerateStory: (input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
  }) => Promise<void>;
  onCustom: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
  onBrowseTemplates: () => void;
}) {
  const [idea, setIdea] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [language, setLanguage] = useState("English");
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]">
        <section className={cn(CARD, "p-5")} aria-label="Generate a slideshow with AI">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] bg-[#FF4A20]/10 text-[#FF4A20]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#232323]">
                Start with one idea
              </h2>
              <p className="text-[11px] text-[#777873]">
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
              <span className="text-[10px] font-semibold text-[#868686]">Slides</span>
              <span className="flex items-center rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA]">
                <button
                  type="button"
                  aria-label="Fewer slides"
                  onClick={() => setSlideCount((count) => Math.max(1, count - 1))}
                  className="grid size-8 place-items-center text-[#777873] transition hover:text-[#232323]"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono text-[11px] font-semibold tabular-nums text-[#30312E]">
                  {slideCount}
                </span>
                <button
                  type="button"
                  aria-label="More slides"
                  onClick={() => setSlideCount((count) => Math.min(20, count + 1))}
                  className="grid size-8 place-items-center text-[#777873] transition hover:text-[#232323]"
                >
                  +
                </button>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#868686]">Language</span>
              <span className="relative">
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="h-8 appearance-none rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA] pl-2.5 pr-7 text-[11px] font-medium text-[#30312E] outline-none focus:border-[#FF4A20]"
                >
                  {["English", "Spanish", "French", "German", "Portuguese", "Italian"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-[#969792]" />
              </span>
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={includeCta}
                onCheckedChange={setIncludeCta}
                aria-label="Include a CTA slide"
              />
              <span className="text-[11px] font-medium text-[#666762]">CTA slide</span>
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
            <p role="alert" className="mt-3 rounded-[9px] bg-destructive/10 p-3 text-[11px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E9EAE4] pt-4">
            {[
              ["01", "Story written by Gemini"],
              ["02", "Review and restyle slides"],
              ["03", "Export ZIP or MP4"],
            ].map(([n, label]) => (
              <span key={n} className="flex items-center gap-2 text-[11px] font-medium text-[#666762]">
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
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-dashed border-[#C6C7BE] text-[#777873] transition-colors group-hover:border-[#FF4A20] group-hover:text-[#FF4A20]">
              <Plus className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#30312E]">Blank slideshow</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#777873]">
                Empty canvas, full control of every slide.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-[#969792] transition-transform group-hover:translate-x-0.5 group-hover:text-[#232323]" />
          </button>

          <button
            type="button"
            onClick={onBrowseTemplates}
            className={cn(CARD, CARD_HOVER, "group flex-1 p-4 text-left")}
          >
            <span className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-[10px] bg-[#F0F1EB] text-[#666762] transition-colors group-hover:bg-[#FF4A20]/10 group-hover:text-[#FF4A20]">
                <FileImage className="size-4.5" />
              </span>
              <ArrowRight className="size-4 text-[#969792] transition-transform group-hover:translate-x-0.5 group-hover:text-[#232323]" />
            </span>
            <span className="mt-3 block text-[13px] font-semibold text-[#30312E]">Template library</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-[#777873]">
              {templates.length} proven formats with hook, structure, and visual direction.
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

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#232323]">
            Proven formats
          </h2>
          <p className="mt-1 text-[11px] text-[#777873]">
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
                <p className="truncate text-[13px] font-semibold text-[#30312E]">{template.name}</p>
                <p className="mt-1 text-[10px] text-[#969792]">
                  {template.category} · {template.slides.length} slides
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(template)}
                className={cn(SECONDARY_BTN, "shrink-0 group-hover:border-[#FF4A20] group-hover:text-[#FF4A20]")}
              >
                Use format
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[11px] border border-[#E4E5DD] bg-[#F7F8F2] p-3.5">
        <Workflow className="size-4 shrink-0 text-[#868686]" />
        <p className="text-[10px] leading-4 text-[#777873]">
          Scheduled slideshow runs are managed in Automations, and slide imagery lives in Collections, so every tool shares the same library.
        </p>
      </div>
    </div>
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
      <DialogContent className="max-h-[92vh] max-w-3xl! overflow-hidden rounded-[13px] border-[#DADBD2] p-0">
        <DialogHeader className="border-b border-[#E9EAE4] px-5 py-4 pr-14">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-[#232323]">
            Template library
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#777873]">
            Start from a proven format or a blank slideshow.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-[#E9EAE4] p-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#969792]" />
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
                    <p className="truncate text-[13px] font-semibold text-[#30312E]">{template.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#969792]">
                      {template.category} · {template.slides.length} slides
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[#777873]">{template.hook}</p>
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
            <div className="grid min-h-40 place-items-center rounded-[11px] border border-dashed border-[#C6C7BE] text-center">
              <div>
                <Search className="mx-auto size-4 text-[#969792]" />
                <p className="mt-2 text-[12px] font-semibold text-[#30312E]">No formats match</p>
                <p className="mt-1 text-[11px] text-[#777873]">Try a niche or a hook phrase.</p>
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
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#969792]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts"
            className={cn(INPUT, "h-9 pl-9")}
          />
        </div>
        <div className="flex rounded-[9px] bg-[#F0F1EB] p-1" role="tablist" aria-label="Filter drafts by status">
          {statusFilters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[11px] font-semibold transition-all",
                status === id ? "bg-white text-[#232323] shadow-sm" : "text-[#777873] hover:text-[#30312E]",
              )}
            >
              {label}
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums",
                  status === id ? "text-[#FF4A20]" : "text-[#969792]",
                )}
              >
                {counts[id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-[11px] bg-destructive/10 p-4 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={cn(CARD, "overflow-hidden")}>
              <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                {Array.from({ length: 3 }).map((_, cell) => (
                  <div key={cell} className="aspect-[9/16] animate-pulse rounded-[7px] bg-[#F0F1EB]" />
                ))}
              </div>
              <div className="space-y-2 p-4">
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#F0F1EB]" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#F0F1EB]" />
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
                    <span className="font-mono text-[10px] tabular-nums text-[#969792]">
                      {project.successfulExportCount} export{project.successfulExportCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-[1.3] text-[#30312E]">
                  {project.title}
                </p>
                {project.status === "generating" ? (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-[#F0F1EB]">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-blue" />
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#777873]">
                      Rendering slide visuals. This draft updates when the jobs finish.
                    </p>
                  </div>
                ) : null}
                {project.status === "failed" ? (
                  <div className="mt-3 rounded-[9px] bg-destructive/10 p-2.5">
                    <p className="text-[10px] leading-4 text-destructive">
                      An image job failed while rendering this draft. Open it to retry the failed slide.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpen(project)}
                      className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-destructive px-2.5 text-[10px] font-bold text-white transition hover:brightness-105 active:scale-[0.97]"
                    >
                      Open to retry
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-[#E9EAE4] pt-3">
                  <span className="text-[10px] text-[#969792]">
                    Updated {new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(project)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#30312E] transition hover:text-[#FF4A20]"
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
        <div className="pf-empty-stage relative mt-5 grid min-h-[320px] place-items-center overflow-hidden rounded-[13px] border border-dashed border-[#C6C7BE] p-8 text-center">
          <div className="relative">
            <span className="mx-auto grid size-11 place-items-center rounded-[11px] bg-white text-[#969792] shadow-[var(--pf-shadow-xs)]">
              <Archive className="size-5" />
            </span>
            <p className="mt-4 text-[13px] font-semibold text-[#30312E]">
              {projects.length ? "No drafts match these filters" : "No slideshow drafts yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[11px] leading-4 text-[#777873]">
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
