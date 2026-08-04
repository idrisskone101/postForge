"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Clock3,
  Download,
  FileImage,
  Images,
  MoreHorizontal,
  LoaderCircle,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { SlidePreview, VisualTile } from "./slide-preview";
import type {
  SlideshowAnalytics,
  SlideshowAutomation,
  SlideshowCollection,
  SlideshowInspiration,
  SlideshowProject,
  SlideshowSection,
  SlideshowTemplate,
} from "./types";

const sections: Array<{
  id: SlideshowSection;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "create", label: "Create", icon: Sparkles },
  { id: "drafts", label: "Drafts", icon: Archive },
  { id: "automations", label: "Automations", icon: CalendarClock },
  { id: "images", label: "Images", icon: Images },
  { id: "inspiration", label: "Inspiration", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function StudioSectionNav({
  section,
  onChange,
}: {
  section: SlideshowSection;
  onChange: (section: SlideshowSection) => void;
}) {
  return (
    <nav
      aria-label="Slideshow studio"
      className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8"
    >
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={section === id ? "page" : undefined}
          className={cn(
            "relative flex h-14 shrink-0 items-center gap-2 px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            section === id && "text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
          {section === id ? (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-coral" />
          ) : null}
        </button>
      ))}
    </nav>
  );
}

function MiniTemplateVisual({
  template,
  className,
}: {
  template: SlideshowTemplate;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-0.5 overflow-hidden bg-black", className)}>
      {template.visualKeys.map((visualKey, index) => (
        <div key={`${visualKey}-${index}`} className="relative overflow-hidden">
          <VisualTile visualKey={visualKey} className="h-full w-full" />
          <div className="absolute inset-0 bg-black/25" />
          <span className="absolute inset-x-1 bottom-3 text-center text-[8px] font-semibold leading-tight text-white drop-shadow">
            {index === 0
              ? template.hook
              : index === 1
                ? "The shift that made it click"
                : "What I would do again"}
          </span>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
}: {
  template: SlideshowTemplate;
  onUse: (template: SlideshowTemplate) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/20 hover:shadow-lg">
      <MiniTemplateVisual template={template} className="h-48" />
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <span className="mb-2 inline-flex rounded-full bg-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {template.category}
          </span>
          <p className="truncate text-sm font-semibold">{template.name}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">by {template.author}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => onUse(template)}
          aria-label={`Use ${template.name}`}
          className="group-hover:border-accent-coral group-hover:bg-accent-coral group-hover:text-white"
        >
          <ChevronRight />
        </Button>
      </div>
    </article>
  );
}

export function CreateView({
  templates,
  onCustom,
  onGenerate,
  onUseTemplate,
  onBrowseTemplates,
}: {
  templates: SlideshowTemplate[];
  onCustom: () => void;
  onGenerate: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
  onBrowseTemplates: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-accent-coral/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-accent-blue/10 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/25 bg-accent-green/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-green">
              <Zap className="size-3" />
              AI slideshow studio
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Turn one idea into a complete, ready-to-post carousel.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Start from a proven format or build from scratch. PostForge shapes the
              hook, story, imagery, layout, and export workflow in one studio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onGenerate}
                className="bg-accent-coral text-white hover:bg-[#ff6540]"
              >
                <Sparkles />
                Generate with AI
              </Button>
              <Button size="lg" variant="outline" onClick={onCustom}>
                <WandSparkles />
                Build custom
              </Button>
              <Button size="lg" variant="ghost" onClick={onBrowseTemplates}>
                <FileImage />
                Browse templates
              </Button>
            </div>
          </div>

          <div className="relative mx-auto h-[286px] w-full max-w-[360px]">
            {["blue-studio", "coral-glow", "mint-room"].map((visualKey, index) => (
              <div
                key={visualKey}
                className="absolute top-0 h-[266px] w-[150px] overflow-hidden rounded-2xl border border-white/20 bg-zinc-900 shadow-2xl"
                style={{
                  left: `${index * 88}px`,
                  transform: `rotate(${(index - 1) * 4}deg) translateY(${index === 1 ? 12 : 0}px)`,
                  zIndex: index + 1,
                }}
              >
                <VisualTile visualKey={visualKey} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/60" />
                <p className="absolute inset-x-3 bottom-5 text-center text-[9px] font-semibold leading-snug text-white">
                  {index === 0
                    ? "The habit I finally stopped fighting"
                    : index === 1
                      ? "A tiny system that lowered the friction"
                      : "Save this for the week you need it"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Quick start
          </p>
          <h2 className="mt-2 text-xl font-semibold">Use a proven format</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Swap the idea, imagery, and brand voice. Keep the structure.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBrowseTemplates} className="hidden sm:flex">
          View all templates
          <ChevronRight />
        </Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {templates.slice(0, 4).map((template) => (
          <TemplateCard key={template.id} template={template} onUse={onUseTemplate} />
        ))}
      </div>
    </div>
  );
}

export function StoryGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
  }) => Promise<void>;
}) {
  const [idea, setIdea] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [language, setLanguage] = useState("English");
  const [includeCta, setIncludeCta] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (idea.trim().length < 3 || generating) return;
    setGenerating(true);
    setError(null);
    try {
      await onGenerate({
        idea: idea.trim(),
        slideCount: Math.min(20, Math.max(1, Math.round(slideCount))),
        language: language.trim() || "English",
        includeCta,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate this slideshow.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
              <Sparkles className="size-4" />
            </span>
            Generate a slideshow story
          </DialogTitle>
          <DialogDescription>
            Give PostForge one idea. You will review and edit every slide before
            exporting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">What is the story about?</span>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              autoFocus
              placeholder="Example: the small reminder habit that made my mornings calmer"
              className="min-h-32 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold">Slides (1–20)</span>
              <input
                type="number"
                min={1}
                max={20}
                value={slideCount}
                onChange={(event) => setSlideCount(Number(event.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold">Language</span>
              <input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
              />
            </label>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3 text-xs">
            <span>
              <span className="block font-semibold">Include a CTA</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                End with one clear save, follow, or next-step prompt.
              </span>
            </span>
            <Switch
              checked={includeCta}
              onCheckedChange={setIncludeCta}
              aria-label="Include CTA slide"
            />
          </label>
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            onClick={() => void submit()}
            disabled={idea.trim().length < 3 || generating}
            className="w-full bg-accent-coral text-white hover:bg-[#ff6540]"
          >
            {generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {generating ? "Writing slides…" : `Generate ${Math.min(20, Math.max(1, slideCount || 1))} slides`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [sort, setSort] = useState<"recommended" | "name">("recommended");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? templates.filter((template) =>
          [template.name, template.category, template.hook]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : templates;
    return sort === "name"
      ? [...matches].sort((a, b) => a.name.localeCompare(b.name))
      : matches;
  }, [query, sort, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl! overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Slideshow templates</DialogTitle>
          <DialogDescription>Start from a format or a blank slideshow.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 border-b border-border p-4 pr-14 sm:flex-row sm:items-center sm:p-5 sm:pr-14">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates…"
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sort templates"
            className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium outline-none"
          >
            <option value="recommended">Recommended</option>
            <option value="name">Name</option>
          </select>
          <Button
            onClick={onCustom}
            className="h-11 bg-accent-coral text-white hover:bg-[#ff6540]"
          >
            <Plus />
            Custom
          </Button>
        </div>
        <div className="max-h-[74vh] overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Templates
              </p>
              <h3 className="mt-1 text-xl font-semibold">Start with a proven format</h3>
            </div>
            <span className="text-xs text-muted-foreground">{visible.length} formats</span>
          </div>
          {visible.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={onUseTemplate} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border text-center">
              <div>
                <Search className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No templates match</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a niche or format name.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const visible = projects.filter((project) => {
    const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || project.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[230px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts"
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-xs font-medium outline-none"
          aria-label="Filter draft status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="generating">Generating</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {visible.map((project) => {
            const firstSlide = project.slides[0];
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onOpen(project)}
                className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-foreground/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-muted/40 p-4">
                  {firstSlide ? (
                    <SlidePreview
                      slide={firstSlide}
                      aspectRatio={project.aspectRatio}
                      phaseSettings={project.phaseSettings[firstSlide.role]}
                      textSettings={project.textSettings}
                      className="h-full max-w-full rounded-xl shadow-lg"
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[9px] font-semibold shadow-sm backdrop-blur">
                    {project.slides.length} slides
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-[9px] font-semibold capitalize shadow-sm backdrop-blur">
                    {project.status}
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-5">{project.title}</p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      Open <ChevronRight className="size-3" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-6 text-center">
          <div>
            <Archive className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold">
              {projects.length ? "No drafts match these filters" : "No slideshow drafts yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              {projects.length
                ? "Clear the search or choose another status."
                : "Start from a proven format and your autosaved work will appear here."}
            </p>
            {!projects.length ? (
              <Button
                onClick={onCreate}
                className="mt-4 bg-accent-coral text-white hover:bg-[#ff6540]"
              >
                <Plus /> New slideshow
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function AutomationsView({
  automations,
  onNew,
  onToggle,
  onEdit,
  onDelete,
}: {
  automations: SlideshowAutomation[];
  onNew: () => void;
  onToggle: (automation: SlideshowAutomation) => void;
  onEdit: (automation: SlideshowAutomation) => void;
  onDelete: (automation: SlideshowAutomation) => Promise<void>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SlideshowAutomation | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete automation.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Recurring automations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate fresh drafts on a schedule and keep publishing reviewable.
          </p>
        </div>
        <Button onClick={onNew} className="bg-accent-coral text-white hover:bg-[#ff6540]">
          <Plus /> New automation
        </Button>
      </div>

      {automations.length ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_140px_110px] gap-3 bg-muted/40 px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Automation</span>
            <span>Status</span>
            <span>Next run</span>
            <span>Actions</span>
          </div>
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="grid gap-4 border-t border-border px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_110px_140px_110px] md:items-center md:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <VisualTile
                  visualKey={automation.visualKey ?? "coral-glow"}
                  className="size-11 shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{automation.name}</p>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {automation.cadence}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground">
                    {automation.visualPolicy === "fresh-ai"
                      ? "Fresh AI images · $0.08 per slide"
                      : "Reuses saved visuals · no image-generation cost"}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold capitalize",
                  automation.status === "active"
                    ? "bg-accent-green/10 text-accent-green"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {automation.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {automation.nextRunAt
                  ? new Date(automation.nextRunAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggle(automation)}
                  aria-label={automation.status === "active" ? "Pause automation" : "Resume automation"}
                >
                  {automation.status === "active" ? <Pause /> : <Play />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${automation.name}`}
                  onClick={() => onEdit(automation)}
                >
                  <Pencil />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`More actions for ${automation.name}`}
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(automation);
                      }}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-6 text-center">
          <div>
            <CalendarClock className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold">No recurring automations</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              Create drafts on a cadence, review them, then publish when they are ready.
            </p>
            <Button onClick={onNew} variant="outline" className="mt-4">
              <Plus /> Create automation
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will stop generating scheduled drafts. Existing drafts are not removed.`
                : "This automation will stop generating scheduled drafts."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-xs text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deleting ? "Deleting…" : "Delete automation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AutomationDialog({
  open,
  projects,
  collections,
  automation,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  projects: SlideshowProject[];
  collections: SlideshowCollection[];
  automation?: SlideshowAutomation | null;
  onOpenChange: (open: boolean) => void;
  onSave: (automation: SlideshowAutomation) => Promise<void>;
}) {
  const [name, setName] = useState("Fresh slideshow ideas");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [days, setDays] = useState(["Mon", "Wed", "Fri"]);
  const [time, setTime] = useState("09:00");
  const [active, setActive] = useState(true);
  const [visualPolicy, setVisualPolicy] = useState<"reuse" | "fresh-ai">(
    "reuse",
  );
  const [imageCollectionId, setImageCollectionId] = useState("");
  const [hooks, setHooks] = useState(
    "A hard truth nobody says out loud\n3 things I wish I knew sooner\nThe tiny change that made it stick",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const cadenceDays = automation?.cadence.match(
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g,
    );
    const cadenceTime = automation?.cadence.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];
    setName(automation?.name ?? "Fresh slideshow ideas");
    setProjectId(automation?.projectId ?? "");
    setDays(
      automation?.weekdays?.length
        ? automation.weekdays
        : cadenceDays?.length
          ? cadenceDays
          : ["Mon", "Wed", "Fri"],
    );
    setTime(automation?.time || cadenceTime || "09:00");
    setActive(automation ? automation.status === "active" : true);
    setVisualPolicy(automation?.visualPolicy ?? "reuse");
    setImageCollectionId(automation?.imageCollectionId ?? "");
    setHooks(
      automation?.hooks?.join("\n") ??
        "A hard truth nobody says out loud\n3 things I wish I knew sooner\nThe tiny change that made it stick",
    );
    setSaveError(null);
  }, [automation, open]);

  const toggleDay = (day: string) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  };

  const selectedProject = projects.find((project) => project.id === projectId);
  const expectedSlideCount = selectedProject?.slides.length || 7;
  const estimatedImageCost = (expectedSlideCount * 0.08).toFixed(2);

  const submit = async () => {
    if (!name.trim() || !days.length || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        ...automation,
        id: automation?.id ?? `local-automation-${Date.now()}`,
        name: name.trim(),
        cadence: `${days.join(", ")} · ${time}`,
        status: active ? "active" : "paused",
        nextRunAt: automation?.nextRunAt ?? null,
        projectId: projectId || null,
        visualKey:
          selectedProject?.slides[0]?.visualKey ??
          automation?.visualKey ??
          "coral-glow",
        weekdays: days,
        time,
        timezone: automation?.timezone,
        visualPolicy,
        imageCollectionId:
          visualPolicy === "reuse" && !projectId && imageCollectionId
            ? imageCollectionId
            : null,
        imageModel: automation?.imageModel ?? "nano-banana-2",
        hooks: hooks
          .split("\n")
          .map((hook) => hook.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save automation.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg! overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automation ? "Edit slideshow automation" : "New slideshow automation"}
          </DialogTitle>
          <DialogDescription>
            {automation
              ? "Update the source, hook pool, visuals, and schedule for future runs."
              : "Define the hook pool and schedule. Generated runs stay in Drafts for review."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Starting slideshow</span>
            <select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                if (event.target.value) setImageCollectionId("");
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none"
            >
              <option value="">Generate from hook pool</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-xs font-semibold">Visuals for each run</legend>
            <div className="mt-2 grid gap-2">
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
                  visualPolicy === "reuse"
                    ? "border-accent-blue bg-accent-blue/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="automation-visual-policy"
                  value="reuse"
                  checked={visualPolicy === "reuse"}
                  onChange={() => setVisualPolicy("reuse")}
                  className="mt-0.5 accent-[var(--accent-blue)]"
                />
                <span>
                  <span className="block text-xs font-semibold">
                    Reuse starting visuals
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                    Safe default. Copies the starting slideshow or saved collection with no
                    image-generation charge.
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
                  visualPolicy === "fresh-ai"
                    ? "border-accent-coral bg-accent-coral/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="automation-visual-policy"
                  value="fresh-ai"
                  checked={visualPolicy === "fresh-ai"}
                  onChange={() => setVisualPolicy("fresh-ai")}
                  className="mt-0.5 accent-[var(--accent-coral)]"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Sparkles className="size-3.5 text-accent-coral" />
                    Generate fresh AI images
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                    Queues one Nano Banana 2 image per slide at $0.08 each. About $
                    {estimatedImageCost} per {expectedSlideCount}-slide run.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          {!projectId && visualPolicy === "reuse" ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold">
                Saved image collection <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <select
                value={imageCollectionId}
                onChange={(event) => setImageCollectionId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none"
              >
                <option value="">No collection · use text backgrounds</option>
                {collections.map((collection) => (
                  <option
                    key={collection.id}
                    value={collection.id}
                    disabled={!collection.imageCount}
                  >
                    {collection.name} · {collection.imageCount} image
                    {collection.imageCount === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                Hook-pool runs cycle through this collection without creating paid jobs.
              </span>
            </label>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Hook list</span>
            <textarea
              value={hooks}
              onChange={(event) => setHooks(event.target.value)}
              className="min-h-28 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs leading-5 outline-none focus:border-accent-blue"
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              One hook per line. Runs avoid previously used hooks.
            </span>
          </label>
          <fieldset>
            <legend className="text-xs font-semibold">Schedule</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={days.includes(day)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border text-[10px] font-semibold transition",
                    days.includes(day)
                      ? "border-accent-coral bg-accent-coral text-white"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {day.slice(0, 1)}
                </button>
              ))}
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none"
              />
            </div>
          </fieldset>
          <label className="flex items-center justify-between rounded-xl border border-border p-3 text-xs">
            <span>
              <span className="block font-semibold">Start active</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                Pause any time without deleting the setup.
              </span>
            </span>
            <Switch
              checked={active}
              onCheckedChange={setActive}
              aria-label={automation ? "Automation active" : "Start automation active"}
            />
          </label>
          {saveError ? (
            <p role="alert" className="text-xs text-destructive">
              {saveError}
            </p>
          ) : null}
          <Button
            onClick={() => void submit()}
            disabled={!name.trim() || !days.length || saving}
            className="w-full bg-accent-coral text-white hover:bg-[#ff6540]"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <CalendarClock />}
            {saving
              ? "Saving…"
              : automation
                ? "Save changes"
                : "Create automation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImagesView({
  collections,
  onPinterest,
  onUpload,
  onRename,
  onDelete,
  uploading = false,
}: {
  collections: SlideshowCollection[];
  onPinterest: () => void;
  onUpload: (files: FileList) => void;
  onRename: (
    collection: SlideshowCollection,
    name: string,
  ) => Promise<void>;
  onDelete: (collection: SlideshowCollection) => Promise<void>;
  uploading?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renameTarget, setRenameTarget] = useState<SlideshowCollection | null>(
    null,
  );
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SlideshowCollection | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const beginRename = (collection: SlideshowCollection) => {
    setRenameTarget(collection);
    setRenameName(collection.name);
    setRenameError(null);
  };

  const submitRename = async () => {
    if (!renameTarget || !renameName.trim() || renaming) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await onRename(renameTarget, renameName);
      setRenameTarget(null);
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Could not rename collection.",
      );
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete collection.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) onUpload(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">Image collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload originals, import public Pinterest URLs, and reuse visual sets.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <Button onClick={onPinterest} className="bg-accent-coral text-white hover:bg-[#ff6540]">
          <Plus /> Pinterest collection
        </Button>
      </div>

      {collections.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <article key={collection.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid h-52 grid-cols-2 gap-0.5 bg-muted">
                {Array.from(
                  { length: Math.min(4, Math.max(1, collection.imageCount)) },
                  (_, index) => {
                    const imageUrl = collection.imageUrls?.[index];
                    const visualKey =
                      collection.visualKeys[index] ?? collection.visualKeys[0] ?? "coral-glow";
                    return imageUrl ? (
                      <span
                        key={`${imageUrl}-${index}`}
                        className="block h-full w-full bg-zinc-900"
                        style={{
                          backgroundImage: `url(${JSON.stringify(imageUrl)})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }}
                      />
                    ) : (
                      <VisualTile
                        key={`${visualKey}-${index}`}
                        visualKey={visualKey}
                        className="h-full w-full"
                      />
                    );
                  },
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{collection.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {collection.imageCount} images
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${collection.name}`}
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => beginRename(collection)}>
                      <Pencil /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(collection);
                      }}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-6 text-center">
          <div>
            <Images className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold">Build your first image collection</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              Hand-pick a consistent visual set for hooks, content, or CTAs.
            </p>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !renaming) {
            setRenameTarget(null);
            setRenameError(null);
          }
        }}
      >
        <DialogContent className="max-w-md!">
          <DialogHeader>
            <DialogTitle>Rename collection</DialogTitle>
            <DialogDescription>
              Give this reusable visual set a clear name.
            </DialogDescription>
          </DialogHeader>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Collection name</span>
            <input
              autoFocus
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitRename();
                }
              }}
              maxLength={160}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
            />
          </label>
          {renameError ? (
            <p role="alert" className="text-xs text-destructive">
              {renameError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={renaming}
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!renameName.trim() || renaming}
              onClick={() => void submitRename()}
              className="bg-accent-coral text-white hover:bg-[#ff6540]"
            >
              {renaming ? <LoaderCircle className="animate-spin" /> : <Pencil />}
              {renaming ? "Saving…" : "Save name"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image collection?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” and its ${deleteTarget.imageCount} saved image${deleteTarget.imageCount === 1 ? "" : "s"} will be removed. Drafts that use this collection may lose those visuals.`
                : "This saved image collection will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-xs text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deleting ? "Deleting…" : "Delete collection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function InspirationView({
  inspiration,
  templates,
  onUse,
}: {
  inspiration: SlideshowInspiration[];
  templates: SlideshowTemplate[];
  onUse: (template: SlideshowTemplate) => void;
}) {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState("all");
  const [templateId, setTemplateId] = useState("all");
  const [sort, setSort] = useState<"curated" | "niche" | "hook">("curated");
  const niches = useMemo(
    () =>
      [...new Set(inspiration.map((item) => item.niche))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [inspiration],
  );
  const inspirationTemplates = useMemo(
    () =>
      templates.filter((template) =>
        inspiration.some((item) => item.templateId === template.id),
      ),
    [inspiration, templates],
  );
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = inspiration.filter(
      (item) =>
        (niche === "all" || item.niche === niche) &&
        (templateId === "all" || item.templateId === templateId) &&
        (!normalizedQuery ||
          [item.hook, item.niche, item.creator]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedQuery)),
    );
    if (sort === "niche") {
      return [...matches].sort(
        (left, right) =>
          left.niche.localeCompare(right.niche) ||
          left.hook.localeCompare(right.hook),
      );
    }
    if (sort === "hook") {
      return [...matches].sort((left, right) =>
        left.hook.localeCompare(right.hook),
      );
    }
    return matches;
  }, [inspiration, niche, query, sort, templateId]);
  const filtersActive = Boolean(query.trim()) || niche !== "all" || templateId !== "all";

  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_190px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search niche, hook, product, or creator"
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <select
          value={niche}
          onChange={(event) => setNiche(event.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-accent-blue"
          aria-label="Filter inspiration by niche"
        >
          <option value="all">All niches</option>
          {niches.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-accent-blue"
          aria-label="Filter inspiration by template"
        >
          <option value="all">All templates</option>
          {inspirationTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-accent-blue"
          aria-label="Sort inspiration"
        >
          <option value="curated">Curated order</option>
          <option value="niche">Niche A–Z</option>
          <option value="hook">Hook A–Z</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-muted-foreground">
        <p>
          These are PostForge format examples, not live ranked social posts. {visible.length}{" "}
          of {inspiration.length} shown.
        </p>
        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setNiche("all");
              setTemplateId("all");
            }}
            className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      {visible.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => {
          const template =
            templates.find((candidate) => candidate.id === item.templateId) ?? templates[0];
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid h-56 grid-cols-3 gap-0.5 bg-black">
                {item.visualKeys.map((visualKey, index) => (
                  <VisualTile key={`${visualKey}-${index}`} visualKey={visualKey} className="h-full w-full" />
                ))}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                  <span>{item.creator} · {item.niche}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1">
                    Format example
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-5">{item.hook}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  disabled={!template}
                  onClick={() => template && onUse(template)}
                >
                  <WandSparkles /> Use this format
                </Button>
              </div>
            </article>
          );
        })}
        </div>
      ) : (
        <div className="mt-6 grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-6 text-center">
          <div>
            <Search className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold">No formats match</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Try another search, niche, or template.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setNiche("all");
                setTemplateId("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Archive;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{helper}</p>
    </article>
  );
}

export function AnalyticsView({
  analytics,
  tiktokConnected = false,
}: {
  analytics: SlideshowAnalytics;
  tiktokConnected?: boolean;
}) {
  const max = Math.max(1, ...analytics.dailyActivity);
  const totalActivity = analytics.dailyActivity.reduce(
    (total, value) => total + value,
    0,
  );
  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">PostForge activity</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          This dashboard reports persisted PostForge drafts, successful local
          exports, and automation runs. It does not estimate social performance.
        </p>
        <p className="mt-3 text-[10px] text-muted-foreground">
          {tiktokConnected
            ? "TikTok posting is connected, but views, engagement, and saves are not synced yet."
            : "TikTok views, engagement, and saves will require an approved account connection and analytics sync."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Draft projects" value={`${analytics.draftProjects}`} helper="Projects currently saved as drafts" icon={Archive} />
        <Metric label="Successful exports" value={`${analytics.successfulExports}`} helper="Server-rendered ZIP and MP4 downloads" icon={Download} />
        <Metric label="Active automations" value={`${analytics.activeAutomations}`} helper="Schedules currently enabled" icon={Workflow} />
        <Metric label="Automation runs" value={`${analytics.successfulAutomationRuns}`} helper="Runs that created a review draft" icon={Clock3} />
      </div>
      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Local activity over time</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Drafts created, exports completed, and automation drafts generated · last 30 days
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
            <Clock3 className="size-3" /> Persisted events only
          </span>
        </div>
        <div className="mt-8 flex h-64 items-end gap-2" aria-label="PostForge activity chart">
          {analytics.dailyActivity.map((value, index) => (
            <div
              key={index}
              className="group relative flex-1 rounded-t-lg bg-accent-blue/15 transition hover:bg-accent-blue/30"
              style={{
                height: value ? `${Math.max(4, (value / max) * 100)}%` : "0%",
              }}
              title={`${value} local ${value === 1 ? "event" : "events"}`}
            >
              <div className="absolute inset-x-0 bottom-0 h-[55%] rounded-t-lg bg-accent-blue/45" />
            </div>
          ))}
        </div>
        {!totalActivity ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Local activity will appear after the first saved draft, successful
            export, or completed automation run.
          </p>
        ) : null}
      </section>
    </div>
  );
}
