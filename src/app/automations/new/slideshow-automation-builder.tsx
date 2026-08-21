"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";

import {
  createSlideshowAutomation,
  fetchSlideshowAutomations,
  fetchSlideshowProjects,
  updateSlideshowAutomation,
} from "@/lib/slideshow/client";
import type {
  SlideshowAutomation,
  SlideshowProject,
} from "@/components/slideshow/types";
import { Switch } from "@/components/ui/switch";
import {
  fetchPlatformCollections,
  type PlatformCollectionSummary,
} from "@/lib/collections-client";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-lg border border-border bg-card px-3 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10";
const FIELD_LABEL = "mb-1.5 block text-[12px] font-semibold text-muted-foreground";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SlideshowAutomationBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existing, setExisting] = useState<SlideshowAutomation | null>(null);
  const [projects, setProjects] = useState<SlideshowProject[]>([]);
  const [collections, setCollections] = useState<PlatformCollectionSummary[]>([]);

  const [name, setName] = useState("Fresh slideshow ideas");
  const [projectId, setProjectId] = useState("");
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [time, setTime] = useState("09:00");
  const [active, setActive] = useState(true);
  const [visualPolicy, setVisualPolicy] = useState<"reuse" | "fresh-ai">("reuse");
  const [imageCollectionId, setImageCollectionId] = useState("");
  const [hooks, setHooks] = useState(
    "A hard truth nobody says out loud\n3 things I wish I knew sooner\nThe tiny change that made it stick",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      fetchSlideshowProjects(),
      fetchSlideshowAutomations(),
      fetchPlatformCollections(),
    ]).then(([projectsResult, automationsResult, collectionsResult]) => {
      if (cancelled) return;
      if (projectsResult.status === "fulfilled") {
        setProjects(projectsResult.value);
      }
      if (collectionsResult.status === "fulfilled") {
        setCollections(collectionsResult.value);
      }
      if (automationsResult.status === "fulfilled") {
        const match = editId
          ? (automationsResult.value.find((automation) => automation.id === editId) ?? null)
          : null;
        setExisting(match);
        if (match) {
          const cadenceDays = match.cadence.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g);
          const cadenceTime = match.cadence.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];
          setName(match.name);
          setProjectId(match.projectId ?? "");
          setDays(match.weekdays?.length ? match.weekdays : (cadenceDays ?? ["Mon", "Wed", "Fri"]));
          setTime(match.time || cadenceTime || "09:00");
          setActive(match.status === "active");
          setVisualPolicy(match.visualPolicy ?? "reuse");
          setImageCollectionId(match.imageCollectionId ?? "");
          if (match.hooks?.length) setHooks(match.hooks.join("\n"));
        }
      }
      if (editId && automationsResult.status === "rejected") {
        setLoadError(
          automationsResult.reason instanceof Error
            ? automationsResult.reason.message
            : "Could not load this automation.",
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const toggleDay = (day: string) => {
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
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
      const payload: SlideshowAutomation = {
        ...existing,
        id: existing?.id ?? `local-automation-${Date.now()}`,
        name: name.trim(),
        cadence: `${days.join(", ")} · ${time}`,
        status: active ? "active" : "paused",
        nextRunAt: existing?.nextRunAt ?? null,
        projectId: projectId || null,
        visualKey:
          selectedProject?.slides[0]?.visualKey ?? existing?.visualKey ?? "coral-glow",
        weekdays: days,
        time,
        timezone: existing?.timezone,
        visualPolicy,
        imageCollectionId:
          visualPolicy === "reuse" && !projectId && imageCollectionId
            ? imageCollectionId
            : null,
        imageModel: existing?.imageModel ?? "nano-banana-2",
        hooks: hooks
          .split("\n")
          .map((hook) => hook.trim())
          .filter(Boolean),
      };
      if (existing) {
        await updateSlideshowAutomation(payload);
      } else {
        await createSlideshowAutomation(payload);
      }
      router.push("/automations");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save automation.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[480px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[var(--pf-orange)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-6 sm:px-7 lg:px-8">
      <Link
        href="/automations"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Automations
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
          <Layers className="size-4.5" />
        </span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
            {existing ? "Edit slideshow automation" : "New slideshow automation"}
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {existing
              ? "Update the source, hook pool, visuals, and schedule for future runs."
              : "Define the hook pool and schedule. Generated runs stay in Slideshow Drafts for review."}
          </p>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="mt-5 space-y-4 rounded-lg border border-border bg-white p-5 shadow-[var(--pf-shadow-2xs)]">
        <label className="block">
          <span className={FIELD_LABEL}>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={cn(INPUT, "h-9")} />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>Starting slideshow</span>
          <span className="relative block">
            <select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                if (event.target.value) setImageCollectionId("");
              }}
              className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-3 pr-8 text-[12px] text-foreground outline-none focus:border-[var(--pf-orange)]"
            >
              <option value="">Generate from hook pool</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </span>
        </label>

        <fieldset>
          <legend className={FIELD_LABEL}>Visuals for each run</legend>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setVisualPolicy("reuse")}
              aria-pressed={visualPolicy === "reuse"}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                visualPolicy === "reuse"
                  ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)]"
                  : "border-border bg-white hover:border-[var(--pf-border-strong)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 place-items-center rounded-full border",
                  visualPolicy === "reuse" ? "border-[var(--pf-ink)] bg-foreground" : "border-[var(--pf-border-strong)]",
                )}
              >
                {visualPolicy === "reuse" ? <Check className="size-2.5 text-white" /> : null}
              </span>
              <span>
                <span className="block text-[12px] font-semibold text-foreground">Reuse starting visuals</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-muted-foreground">
                  Safe default. Copies the starting slideshow or a saved collection with no image charge.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisualPolicy("fresh-ai")}
              aria-pressed={visualPolicy === "fresh-ai"}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                visualPolicy === "fresh-ai"
                  ? "border-[var(--pf-orange)] bg-[var(--pf-orange)]/[0.04]"
                  : "border-border bg-white hover:border-[var(--pf-border-strong)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 place-items-center rounded-full border",
                  visualPolicy === "fresh-ai" ? "border-[var(--pf-orange)] bg-[var(--pf-orange)]" : "border-[var(--pf-border-strong)]",
                )}
              >
                {visualPolicy === "fresh-ai" ? <Check className="size-2.5 text-white" /> : null}
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                  <Sparkles className="size-3 text-[var(--pf-orange)]" />
                  Generate fresh AI images
                </span>
                <span className="mt-0.5 block text-[12px] leading-4 text-muted-foreground">
                  One Nano Banana 2 image per slide at $0.08. About ${estimatedImageCost} per {expectedSlideCount}-slide run.
                </span>
              </span>
            </button>
          </div>
        </fieldset>

        {!projectId && visualPolicy === "reuse" ? (
          <label className="block">
            <span className={FIELD_LABEL}>
              Shared image collection <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <span className="relative block">
              <select
                value={imageCollectionId}
                onChange={(event) => setImageCollectionId(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-3 pr-8 text-[12px] text-foreground outline-none focus:border-[var(--pf-orange)]"
              >
                <option value="">No collection · use text backgrounds</option>
                {collections.map((collection) => (
                  <option
                    key={collection.id}
                    value={collection.id}
                    disabled={!collection.imageCount}
                  >
                    {collection.name} · {collection.imageCount} image{collection.imageCount === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </span>
            <span className="mt-1 block text-[12px] text-muted-foreground">
              Hook-pool runs cycle through this collection from the shared library without creating paid jobs.
            </span>
          </label>
        ) : null}

        <label className="block">
          <span className={FIELD_LABEL}>Hook pool</span>
          <textarea
            value={hooks}
            onChange={(event) => setHooks(event.target.value)}
            rows={3}
            className={cn(INPUT, "resize-none py-2 leading-5")}
          />
          <span className="mt-1 block text-[12px] text-muted-foreground">
            One hook per line. Runs avoid previously used hooks.
          </span>
        </label>

        <fieldset>
          <legend className={FIELD_LABEL}>Schedule</legend>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={days.includes(day)}
                className={cn(
                  "grid size-8 place-items-center rounded-lg border text-[12px] font-bold transition",
                  days.includes(day)
                    ? "border-[var(--pf-ink)] bg-foreground text-background"
                    : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)] hover:text-foreground",
                )}
              >
                {day.slice(0, 1)}
              </button>
            ))}
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Run time"
              className={cn(INPUT, "ml-auto h-8 w-[104px] px-2")}
            />
          </div>
        </fieldset>

        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span>
            <span className="block text-[12px] font-semibold text-foreground">Start active</span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              Pause any time without deleting the setup.
            </span>
          </span>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            aria-label={existing ? "Automation active" : "Start automation active"}
          />
        </label>

        {saveError ? (
          <p role="alert" className="text-[11px] text-destructive">
            {saveError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!name.trim() || !days.length || saving}
          className="pf-button-primary h-10 w-full"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
          {saving ? "Saving..." : existing ? "Save changes" : "Create automation"}
        </button>
      </div>
    </div>
  );
}
