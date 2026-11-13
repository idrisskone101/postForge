"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/workbench/button";
import { Field } from "@/components/workbench/field";
import { Icon } from "@/components/workbench/icon";
import { Toggle } from "@/components/workbench/toggle";
import { STORY_MODELS } from "@/lib/ai/story-models";

import { readWorkspaceStoryModelName } from "./create-idea-workspace-model";
import { useSlideshowHome } from "./slideshow-home-provider";

export function CreateIdeaForm() {
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

  const stepSlides = (delta: number) =>
    setForm((current) => ({
      ...current,
      slideCount: Math.min(20, Math.max(1, current.slideCount + delta)),
    }));

  return (
    <>
      <Field label="What is the story about?" htmlFor="slideshow-idea">
        <textarea
          id="slideshow-idea"
          value={form.idea}
          onChange={(event) =>
            setForm((current) => ({ ...current, idea: event.target.value }))
          }
          placeholder="A small morning habit"
          className="wb-input h-[190px] resize-none py-3 leading-[21px] not-focus:shadow-[inset_0_0_0_1px_var(--pf-outline)]"
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <div className="flex w-[160px] shrink-0 flex-col gap-1.5">
          <span className="wb-label" id="slideshow-slide-count-label">
            Slides
          </span>
          <div
            role="group"
            aria-labelledby="slideshow-slide-count-label"
            className="flex h-[42px] items-center justify-between rounded-lg bg-raised px-[5px]"
          >
            <button
              type="button"
              aria-label="Fewer slides"
              disabled={form.slideCount <= 1}
              onClick={() => stepSlides(-1)}
              className={STEP_BTN}
            >
              <Minus className="size-4" strokeWidth={1.5} />
            </button>
            <span
              aria-live="polite"
              className="text-[14px] font-bold leading-[18px] tabular-nums text-fg"
            >
              {form.slideCount}
            </span>
            <button
              type="button"
              aria-label="More slides"
              disabled={form.slideCount >= 20}
              onClick={() => stepSlides(1)}
              className={STEP_BTN}
            >
              <Plus className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <Field label="Language" htmlFor="slideshow-language" className={SELECT_FIELD}>
          <select
            id="slideshow-language"
            value={form.language}
            onChange={(event) =>
              setForm((current) => ({ ...current, language: event.target.value }))
            }
            className="wb-input w-full font-medium"
          >
            {LANGUAGES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Story model" htmlFor="slideshow-story-model" className={SELECT_FIELD}>
          <select
            id="slideshow-story-model"
            value={form.model}
            onChange={(event) =>
              setForm((current) => ({ ...current, model: event.target.value }))
            }
            title={
              form.model
                ? STORY_MODELS.find((m) => m.id === form.model)?.description
                : "Uses the intelligence model chosen in Settings"
            }
            className="wb-input w-full font-medium"
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
        </Field>
      </div>

      {error ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>Slideshow not generated.</strong> {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <label className="flex items-center gap-2.5 text-[14px] font-medium leading-[18px] text-fg">
          <Toggle
            checked={form.includeCta}
            onCheckedChange={(includeCta) =>
              setForm((current) => ({ ...current, includeCta }))
            }
            label="Include a CTA slide"
            size={26}
          />
          CTA slide
        </label>
        <Button
          variant="primary"
          size={40}
          onClick={() => void submit()}
          disabled={form.idea.trim().length < 3 || generating}
          aria-busy={generating}
          className="h-11 pl-4 pr-5 font-bold"
        >
          <Icon name="generate" />
          {generating ? "Writing slides" : "Generate slideshow"}
        </Button>
      </div>
    </>
  );
}

// Equal shares like the drawing, but never narrower than the longest option: a fixed share clipped
// "Workspace default" at 1280 and 390, so the row wraps instead.
const SELECT_FIELD = "min-w-fit flex-[1_1_0%]";

const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Italian"];

const STEP_BTN =
  "wb-hit grid size-8 shrink-0 place-items-center rounded-[999px] bg-strong text-strong-fg outline-none transition-[background-color,transform] duration-[160ms] ease-pf hover:bg-[var(--pf-strong-hover)] focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] active:scale-[0.96] disabled:opacity-50";
