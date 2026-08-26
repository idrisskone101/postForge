"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LoaderCircle, Sparkles } from "lucide-react";

import { SlideshowPaintText } from "@/app/(app)/slideshow/slideshow-paint-text";
import { STORY_MODELS } from "@/lib/ai/story-models";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";

import { readWorkspaceStoryModelName } from "./create-idea-workspace-model";

import { useSlideshowHome } from "./slideshow-home-provider";
import { CARD, INPUT, StepChip } from "./studio-ui";

export function CreateIdeaForm() {
  const paintReady = useWindowLoadReady();
  const { generatingStory: generating, onGenerateStory } = useSlideshowHome();
  const [form, setForm] = useState({
    idea: "",
    slideCount: 7,
    language: "English",
    model: "",
    includeCta: true,
  });
  const [workspaceModelName, setWorkspaceModelName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readWorkspaceStoryModelName().then((name) => {
      if (!cancelled && name) setWorkspaceModelName(name);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (form.idea.trim().length < 3 || generating) return;
    setError(null);
    try {
      await onGenerateStory({
        idea: form.idea.trim(),
        slideCount: Math.min(20, Math.max(1, Math.round(form.slideCount))),
        language: form.language.trim() || "English",
        includeCta: form.includeCta,
        model: form.model || undefined,
      });
      setForm((current) => ({ ...current, idea: "" }));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate this slideshow.",
      );
    }
  };

  return (
    <section
      className={cn(CARD, "p-5")}
      data-slideshow-idea={paintReady ? undefined : "true"}
      aria-label="Generate a slideshow with AI"
    >
      <div
        className="flex items-center gap-2.5"
        data-slideshow-idea-title={paintReady ? undefined : "true"}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2>
            <SlideshowPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName="pf-section-title"
              paint={<span className="sr-only">Start with one idea</span>}
            >
              Start with one idea
            </SlideshowPaintText>
          </h2>
          <p>
            <SlideshowPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName="text-[13px] leading-[1.35] text-muted-foreground"
              paint={
                <span className="sr-only">PostForge writes the story. You review every slide.</span>
              }
            >
              PostForge writes the story. You review every slide.
            </SlideshowPaintText>
          </p>
        </div>
      </div>

      <textarea
        value={form.idea}
        onChange={(event) =>
          setForm((current) => ({ ...current, idea: event.target.value }))
        }
        rows={3}
        placeholder="A small morning habit"
        aria-label="What is the story about?"
        style={{ height: "5.125rem" }}
        className={cn(INPUT, "mt-4 h-[5.125rem] resize-none py-2.5 leading-5")}
      />

      <div
        className="mt-3 flex flex-wrap items-center gap-3 overflow-hidden"
        data-slideshow-idea-controls={paintReady ? undefined : "true"}
      >
        <label className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-foreground">Slides</span>
          <span className="flex items-center rounded-lg border border-border bg-card">
            <button
              type="button"
              aria-label="Fewer slides"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  slideCount: Math.max(1, current.slideCount - 1),
                }))
              }
              className="grid size-8 place-items-center text-muted-foreground transition hover:text-foreground"
            >
              -
            </button>
            <span className="w-7 text-center font-mono text-[13px] font-semibold tabular-nums text-foreground">
              {form.slideCount}
            </span>
            <button
              type="button"
              aria-label="More slides"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  slideCount: Math.min(20, current.slideCount + 1),
                }))
              }
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
              value={form.language}
              onChange={(event) =>
                setForm((current) => ({ ...current, language: event.target.value }))
              }
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
              value={form.model}
              onChange={(event) =>
                setForm((current) => ({ ...current, model: event.target.value }))
              }
              aria-label="Story model"
              title={
                form.model
                  ? STORY_MODELS.find((m) => m.id === form.model)?.description
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
          <button
            type="button"
            role="switch"
            aria-checked={form.includeCta}
            aria-label="Include a CTA slide"
            onClick={() =>
              setForm((current) => ({ ...current, includeCta: !current.includeCta }))
            }
            className={cn(
              "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent transition-colors",
              form.includeCta ? "bg-primary" : "bg-input",
            )}
          >
            <span
              className={cn(
                "block size-4 rounded-full bg-background transition-transform",
                form.includeCta ? "translate-x-[14px]" : "translate-x-0.5",
              )}
            />
          </button>
          <span className="text-[11px] font-medium text-muted-foreground">CTA slide</span>
        </label>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={form.idea.trim().length < 3 || generating}
          data-slideshow-idea-submit={paintReady ? undefined : "true"}
          className="pf-button-primary ml-auto h-10 px-5"
        >
          {generating ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {generating ? "Writing slides..." : `Generate ${form.slideCount} slides`}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      <div
        className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 overflow-hidden border-t border-border pt-4"
        data-slideshow-idea-steps={paintReady ? undefined : "true"}
      >
        {[
          ["01", `Story written by ${STORY_MODELS.find((m) => m.id === form.model)?.name ?? "AI"}`],
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
  );
}
