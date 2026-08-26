"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createSlideshowAutomation,
  fetchSlideshowAutomations,
  updateSlideshowAutomation,
} from "@/lib/slideshow/client";
import { fetchAllSlideshowProjectPages } from "@/lib/slideshow/list-client";
import type { SlideshowAutomation, SlideshowProjectListItem } from "@/components/slideshow/types";
import { fetchPlatformCollections, type PlatformCollectionSummary } from "@/lib/collections-client";
import { SlideshowAutomationBuilderChrome } from "./slideshow-automation-builder-chrome";
import { SlideshowAutomationBuilderFields } from "./slideshow-automation-builder-fields";

export function SlideshowAutomationBuilder({
  search,
}: {
  search: { id?: string | string[] };
}) {
  const router = useRouter();
  const editId = typeof search.id === "string" ? search.id : null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existing, setExisting] = useState<SlideshowAutomation | null>(null);
  const [projects, setProjects] = useState<SlideshowProjectListItem[]>([]);
  const [collections, setCollections] = useState<PlatformCollectionSummary[]>([]);

  const [name, setName] = useState("Fresh slideshow ideas");
  const [projectId, setProjectId] = useState("");
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [time, setTime] = useState("09:00");
  const [active, setActive] = useState(true);
  const [visualPolicy, setVisualPolicy] = useState<"reuse" | "fresh-ai">("reuse");
  const [imageCollectionId, setImageCollectionId] = useState("");
  const [hooks, setHooks] = useState(
    "A hard truth nobody says out loud\n3 things I wish I knew sooner\nThe tiny change that made it stick"
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      fetchAllSlideshowProjectPages(),
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
            : "Could not load this automation."
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
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  };

  const selectedProject = projects.find((project) => project.id === projectId);
  const expectedSlideCount = selectedProject?.slideCount || 7;
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
        visualKey: existing?.visualKey ?? "coral-glow",
        weekdays: days,
        time,
        timezone: existing?.timezone,
        visualPolicy,
        imageCollectionId:
          visualPolicy === "reuse" && !projectId && imageCollectionId ? imageCollectionId : null,
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
      <SlideshowAutomationBuilderChrome existing={Boolean(existing)} />

      {loadError ? (
        <p
          role="alert"
          className="mt-4 rounded-[8px] bg-[var(--pf-danger)]/10 p-3 text-[11px] text-[var(--pf-danger)]"
        >
          {loadError}
        </p>
      ) : null}

      <SlideshowAutomationBuilderFields
        fields={{
          name,
          projectId,
          days,
          time,
          active,
          visualPolicy,
          imageCollectionId,
          hooks,
          projects,
          collections,
          expectedSlideCount,
          estimatedImageCost,
          saving,
          saveError,
          existing: Boolean(existing),
          onNameChange: setName,
          onProjectChange: (value) => {
            setProjectId(value);
            if (value) setImageCollectionId("");
          },
          onVisualPolicyChange: setVisualPolicy,
          onImageCollectionChange: setImageCollectionId,
          onHooksChange: setHooks,
          onToggleDay: toggleDay,
          onTimeChange: setTime,
          onActiveChange: setActive,
          onSubmit: submit,
          saveLabel: slideshowSaveLabel(saving, Boolean(existing)),
        }}
      />
    </div>
  );
}

function slideshowSaveLabel(saving: boolean, existing: boolean) {
  if (saving) return "Saving...";
  if (existing) return "Save changes";
  return "Create automation";
}
