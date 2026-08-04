"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  Dices,
  Download,
  Loader2,
  RefreshCw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import {
  buildCharacterImagePrompt,
  buildCharacterPrompt,
  characterRecipeFingerprint,
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
  randomCharacterAttributes,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { apiGet, apiPost } from "@/lib/api/client";
import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

function makeCharacterId() {
  return `character_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function portraitFile(sourceUrl: string, characterId: string) {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Character preview image could not be loaded.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Character preview did not return a valid image.");
  }
  const extension = blob.type.includes("png") ? "png" : "jpg";
  return new File([blob], `${characterId}.${extension}`, { type: blob.type });
}

async function saveCharacterAvatar({
  currentAvatarId,
  characterId,
  name,
  attributes,
  previewSeed,
  previewFingerprint,
  previewSourceUrl,
}: {
  currentAvatarId: string | null;
  characterId: string;
  name: string;
  attributes: CharacterAttributes;
  previewSeed: number;
  previewFingerprint: string;
  previewSourceUrl: string;
}) {
  const file = await portraitFile(previewSourceUrl, characterId);
  const formData = new FormData();
  formData.set("file", file);
  formData.set("name", name);
  formData.set("origin", "generated");
  formData.set(
    "provenance",
    JSON.stringify({
      avatarProfile: {
        characterId,
        attributes,
        previewSeed,
        previewFingerprint,
        previewKind: "photographic",
      },
      seedReferenceImages: [],
    })
  );
  let response = currentAvatarId
    ? await fetch(`/api/avatars/${encodeURIComponent(currentAvatarId)}`, {
        method: "PUT",
        body: formData,
      })
    : null;
  if (!response || response.status === 404) {
    response = await fetch("/api/avatars", { method: "POST", body: formData });
  }
  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: string }
    | null;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error ?? "Reusable avatar could not be saved.");
  }
  return payload.id;
}

type CharacterPreviewJob = {
  status: "queued" | "processing" | "completed" | "failed" | string;
  error?: string | null;
  outputs: Array<{ id: string }>;
};

async function waitForCharacterPreview(jobId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = await apiGet<CharacterPreviewJob>(
      `/api/jobs/${encodeURIComponent(jobId)}`
    );
    if (job.status === "completed") {
      const output = job.outputs[0];
      if (!output) throw new Error("The provider completed without a portrait image.");
      return output.id;
    }
    if (job.status === "failed") {
      throw new Error(job.error ?? "Character preview generation failed.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
  }
  throw new Error("Character preview is taking longer than expected. Try again shortly.");
}

export function parseImportedCharacterAttributes(input: string): CharacterAttributes {
  const validGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) => section.groups);
  const next: CharacterAttributes = {};

  function acceptValue(key: string, value: string) {
    const group = validGroups.find((candidate) => candidate.key === key);
    if (!group) return;
    const trimmed = value.trim();
    if (group.key === "lipFullness") {
      const number = Number(trimmed.replace(/%$/, ""));
      if (Number.isFinite(number) && number >= 0 && number <= 100) {
        next[group.key] = String(Math.round(number));
      }
      return;
    }
    const supported = group.options.find(
      (option) => option.toLowerCase() === trimmed.toLowerCase()
    );
    if (supported) next[group.key] = supported;
  }

  try {
    const parsed = JSON.parse(input) as unknown;
    const candidate =
      parsed && typeof parsed === "object" && "attributes" in parsed
        ? (parsed as { attributes: unknown }).attributes
        : parsed;
    if (candidate && typeof candidate === "object") {
      Object.entries(candidate as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === "string") acceptValue(key, value);
      });
    }
  } catch {
    for (const group of validGroups) {
      const expression = new RegExp(`${group.label}\\s*:\\s*([^,\\n]+)`, "i");
      const match = input.match(expression);
      if (match?.[1]) acceptValue(group.key, match[1]);
    }
  }

  if (Object.keys(next).length === 0) {
    throw new Error("No supported character attributes were found.");
  }
  return next;
}

export function CharacterBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [recordId, setRecordId] = useState(() => editId ?? makeCharacterId());
  const [name, setName] = useState("Untitled character");
  const [attributes, setAttributes] = useState<CharacterAttributes>({
    ...DEFAULT_CHARACTER_ATTRIBUTES,
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [previewSeed, setPreviewSeed] = useState(0);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFingerprint, setPreviewFingerprint] = useState<string | null>(
    () => characterRecipeFingerprint(DEFAULT_CHARACTER_ATTRIBUTES)
  );
  const [previewIsPhotographic, setPreviewIsPhotographic] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));
  const [missingEditRecord, setMissingEditRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importValue, setImportValue] = useState("");

  const active = useMemo(
    () => CHARACTER_ATTRIBUTE_SECTIONS.find((section) => section.id === activeSection),
    [activeSection]
  );
  const currentPreviewFingerprint = useMemo(
    () => characterRecipeFingerprint(attributes),
    [attributes]
  );
  const previewDirty = currentPreviewFingerprint !== previewFingerprint;
  const previewSourceUrl = previewFileId
    ? `/api/files/${encodeURIComponent(previewFileId)}`
    : previewIsPhotographic && avatarId
      ? `/api/avatars/${encodeURIComponent(avatarId)}`
      : "/character-builder/default-portrait.png";

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoading(true);
    setMissingEditRecord(false);
    fetchWorkspaceFeature<CharacterRecord>("characters")
      .then(({ records }) => {
        const record = records.find((candidate) => candidate.id === editId);
        if (!cancelled && record && isCharacterRecord(record)) {
          setRecordId(record.id);
          setName(record.name);
          setAttributes({ ...DEFAULT_CHARACTER_ATTRIBUTES, ...record.attributes });
          setPreviewSeed(record.previewSeed);
          setAvatarId(record.avatarId ?? null);
          setPreviewFileId(null);
          setPreviewIsPhotographic(record.previewKind === "photographic");
          setPreviewFingerprint(
            record.previewKind === "photographic"
              ? record.previewFingerprint ?? null
              : null
          );
          setMissingEditRecord(false);
        }
        if (!cancelled && !record) {
          setMissingEditRecord(true);
          setError("That character could not be found. Return to Characters and choose an existing draft.");
        }
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load character"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function selectAttribute(key: string, value: string) {
    setAttributes((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function randomize() {
    setAttributes(randomCharacterAttributes());
    setPreviewSeed(Math.floor(Math.random() * 1000));
    notify("Character randomized");
  }

  async function rerender() {
    const requestedFingerprint = characterRecipeFingerprint(attributes);
    setRendering(true);
    setError(null);
    try {
      const job = await apiPost<{ id: string }>("/api/generate/images", {
        prompt: buildCharacterImagePrompt(attributes),
        model: "nano-banana-2",
        aspectRatio: "3:4",
        numImages: 1,
        negativePrompt:
          "text, caption, logo, watermark, collage, extra people, duplicate face, cropped head, plastic skin",
        characterPreview: true,
        characterRecipeFingerprint: requestedFingerprint,
      });
      const generatedFileId = await waitForCharacterPreview(job.id);
      setPreviewFileId(generatedFileId);
      setPreviewFingerprint(requestedFingerprint);
      setPreviewSeed((value) => value + 1);
      notify("Photographic preview updated");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to generate character preview"
      );
    } finally {
      setRendering(false);
    }
  }

  async function copyAttributes() {
    await navigator.clipboard.writeText(
      JSON.stringify({ name, attributes }, null, 2)
    );
    notify("Attributes JSON copied");
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildCharacterPrompt(attributes));
    notify("Character prompt copied");
  }

  function applyImport() {
    try {
      const imported = parseImportedCharacterAttributes(importValue);
      setAttributes((current) => ({ ...current, ...imported }));
      setImportOpen(false);
      setImportValue("");
      notify(`${Object.keys(imported).length} attributes imported`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import attributes");
    }
  }

  async function saveCharacter() {
    if (missingEditRecord) {
      setError("This edit link no longer points to a saved character.");
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Add a character name before saving.");
      return;
    }
    if (previewDirty || !previewFingerprint) {
      setError("Re-render preview so the saved photo matches the current recipe.");
      return;
    }
    setSaving(true);
    setError(null);
    const now = new Date().toISOString();
    const record: CharacterRecord = {
      id: recordId,
      name: cleanName,
      attributes,
      previewSeed,
      avatarId,
      previewKind: "photographic",
      previewFingerprint,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const existing = await fetchWorkspaceFeature<CharacterRecord>("characters");
      const previous = existing.records.find((candidate) => candidate.id === recordId);
      if (previous?.createdAt) record.createdAt = previous.createdAt;
      record.avatarId = await saveCharacterAvatar({
        currentAvatarId: avatarId ?? previous?.avatarId ?? null,
        characterId: recordId,
        name: cleanName,
        attributes,
        previewSeed,
        previewFingerprint,
        previewSourceUrl,
      });
      setAvatarId(record.avatarId);
      setPreviewIsPhotographic(true);
      await saveWorkspaceFeature("characters", record);
      notify("Character saved and added to reusable avatars");
      window.setTimeout(() => router.push("/characters"), 350);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save character");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="pf-content-viewport grid place-items-center"><Loader2 className="size-7 animate-spin text-[#FF4A20]" /></div>;
  }

  const recipeGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap(
    (section) => section.groups
  );
  const completedRecipeGroups = recipeGroups.filter(
    (group) => Boolean(attributes[group.key]?.trim())
  ).length;
  const recipeProgress = Math.round(
    (completedRecipeGroups / Math.max(1, recipeGroups.length)) * 100
  );

  return (
    <div
      data-character-workbench="true"
      className="pf-content-viewport bg-[#F3F4EF] min-[1280px]:grid min-[1280px]:h-dvh min-[1280px]:min-h-0 min-[1280px]:grid-cols-[200px_minmax(420px,1.2fr)_minmax(360px,0.8fr)] min-[1280px]:grid-rows-[64px_minmax(0,1fr)] min-[1280px]:overflow-hidden"
    >
      <header
        data-character-workbench-header="true"
        className="flex flex-col gap-3 border-b border-[#DADBD2] bg-white px-4 py-3 min-[1280px]:col-span-3 min-[1280px]:row-start-1 min-[1280px]:h-16 min-[1280px]:flex-row min-[1280px]:items-center min-[1280px]:gap-4 min-[1280px]:py-2"
      >
        <div className="flex min-w-0 items-center gap-2 min-[1280px]:w-[184px] min-[1280px]:shrink-0">
          <Link href="/characters" aria-label="Back to characters" className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#E1E2DC] hover:bg-[#F3F4EF]">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938E]">Characters</p>
            <h1 className="truncate text-[12px] font-semibold">{editId ? "Edit character" : "Character builder"}</h1>
          </div>
        </div>

        <label className="min-w-0 flex-1 min-[1280px]:max-w-[300px]">
          <span className="sr-only">Character name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Character name" className="h-9 w-full rounded-[9px] border border-[#DADBD2] bg-[#FAFAF8] px-3 text-[11px] font-medium outline-none transition focus:border-[#FF4A20] focus:bg-white focus:ring-2 focus:ring-[#FF4A20]/15" placeholder="Add character name…" />
        </label>

        <div className="flex min-w-0 flex-wrap gap-2 min-[1280px]:ml-auto min-[1280px]:flex-nowrap">
          <button onClick={randomize} className="pf-button-secondary h-9"><Dices className="size-3.5" /> Randomize</button>
          <button onClick={() => setImportOpen(true)} aria-label="Import prompt or JSON" className="pf-button-secondary h-9"><Upload className="size-3.5" /> Import</button>
          <button onClick={copyAttributes} aria-label="Copy attributes JSON" className="pf-button-secondary h-9"><Clipboard className="size-3.5" /> Copy JSON</button>
          <button onClick={saveCharacter} disabled={saving || missingEditRecord || previewDirty} aria-label="Save character" title={previewDirty ? "Re-render the photographic preview before saving" : undefined} className="pf-button-primary h-9 shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-45"><Save className="size-3.5" /> {saving ? "Saving…" : missingEditRecord ? "Unavailable" : previewDirty ? "Preview changed" : "Save"}</button>
        </div>
      </header>

      <aside
        data-character-category-rail="true"
        data-character-recipe-step-rail="true"
        className="border-b border-[#DADBD2] bg-[#EEEFE8] min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r"
      >
        <div className="border-b border-[#DADBD2] px-3 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#858681]">Attribute recipe</p>
              <p className="mt-1 text-[10px] font-semibold">{completedRecipeGroups} of {recipeGroups.length} complete</p>
            </div>
            <span className="text-[11px] font-semibold text-[#777873]">{recipeProgress}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#D9DAD3]"><span className="block h-full rounded-full bg-[#FF4A20]" style={{ width: `${recipeProgress}%` }} /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 min-[1280px]:block min-[1280px]:h-[calc(100%_-_116px)] min-[1280px]:overflow-y-auto min-[1280px]:px-2 min-[1280px]:py-2" aria-label="Character attribute recipe">
          <button
            onClick={() => setActiveSection("overview")}
            aria-current={activeSection === "overview" ? "page" : undefined}
            className={cn(
              "flex h-10 min-w-max items-center gap-2 rounded-lg px-2.5 text-[10px] min-[1280px]:w-full",
              activeSection === "overview" ? "bg-white font-semibold shadow-[0_1px_0_rgba(35,35,35,0.04)]" : "text-[#666762] hover:bg-[#E5E6DF]"
            )}
          >
            <span className="grid size-5 place-items-center rounded-md bg-[#E5E6DF] text-[10px] font-bold">00</span>
            <span className="min-w-0 flex-1 text-left">Overview</span>
            <Check className="size-3 text-[#3A9B55]" />
          </button>
          {CHARACTER_ATTRIBUTE_SECTIONS.map((section, sectionIndex) => {
            const summary = section.groups.slice(0, 2).map((group) => attributes[group.key]).join(" · ");
            const sectionComplete = section.groups.every((group) => Boolean(attributes[group.key]?.trim()));
            return <button key={section.id} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "page" : undefined} className={cn("group flex min-w-[150px] items-center gap-2 rounded-lg px-2.5 py-2 text-left min-[1280px]:w-full min-[1280px]:min-w-0",activeSection === section.id ? "bg-white shadow-[0_1px_0_rgba(35,35,35,0.04)]" : "hover:bg-[#E5E6DF]")}><span className={cn("grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold",activeSection === section.id ? "bg-[#232323] text-white" : "bg-[#E5E6DF] text-[#777873]")}>{String(sectionIndex + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><b className="block truncate text-[10px] font-medium">{section.label}</b><small className="mt-0.5 block truncate text-[10px] text-[#92938E]">{summary}</small></span>{sectionComplete ? <Check className="size-3 text-[#3A9B55]" /> : activeSection === section.id ? <ChevronDown className="size-3 text-[#FF4A20]" /> : <ChevronRight className="size-3 text-[#999A95]" />}</button>;
          })}
        </nav>
      </aside>

      <section
        data-character-preview-stage="true"
        aria-label="Live character portrait"
        className="relative flex min-h-[620px] min-w-0 flex-col overflow-hidden border-b border-[#DADBD2] bg-[#B9BAB7] px-5 pb-5 pt-5 dark:bg-[#3A3D3B] min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r min-[1280px]:px-6 min-[1280px]:pb-5 min-[1280px]:pt-5"
      >
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="pf-eyebrow !text-[#51524E]">Photographic recipe preview</p>
            <p className="mt-1 max-w-[310px] text-[10px] leading-4 text-[#5F605C]">Every attribute becomes part of the generation recipe. Changes apply to the photo when you re-render.</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm",rendering ? "bg-[#EAF2FF] text-[#347DCC]" : previewDirty ? "bg-[#FFF3DD] text-[#8B641A]" : "bg-[#E7F5E9] text-[#268B42]")}>{rendering ? <Loader2 className="size-3 animate-spin" /> : previewDirty ? <RefreshCw className="size-3" /> : <Check className="size-3" />}{rendering ? "Rendering" : previewDirty ? "Changes pending" : "Preview ready"}</span>
        </div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-20 top-24 size-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-[#7F8681]/20 blur-3xl" />
        </div>

        <div className="relative z-10 grid min-h-0 flex-1 place-items-center py-4 min-[1280px]:py-3">
          <div className="aspect-[3/4] h-auto max-h-full w-full max-w-[390px] overflow-hidden rounded-[18px] border-[6px] border-white/95 bg-white shadow-[0_28px_70px_rgba(35,35,31,0.28)] min-[1280px]:max-w-[440px]">
            <CharacterPhoto generatedFileId={previewFileId} avatarId={!previewFileId && previewIsPhotographic ? avatarId : null} alt={`${name || "Untitled character"} photographic preview`} className={cn("transition duration-300 motion-reduce:transition-none", rendering && "scale-[1.01] blur-[2px] grayscale-[.2]")} />
          </div>
        </div>

        <div className="relative z-10 grid gap-2 rounded-[12px] border border-white/35 bg-white/20 p-2.5 backdrop-blur-sm sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1420px]:grid-cols-2">
          <button onClick={rerender} disabled={rendering} className="pf-button-secondary !border-white/70 !bg-[var(--pf-surface)]"><RefreshCw className={cn("size-3.5",rendering && "animate-spin")} /> Re-render preview</button>
          <button onClick={randomize} className="pf-button-secondary !border-white/50 !bg-[var(--pf-surface)]"><Dices className="size-3.5" /> Randomize identity</button>
          <div className="flex min-w-0 items-center gap-2 px-1 py-1 sm:col-span-2 min-[1280px]:col-span-1 min-[1420px]:col-span-2">
            <span className="size-1.5 shrink-0 rounded-full bg-[#22C55E]" />
            <p className="min-w-0 break-words text-[10px] font-medium text-[#4E504C]">{attributes.gender} · {attributes.age} · {attributes.ethnicity}</p>
          </div>
        </div>
      </section>

      <main
        data-character-attribute-editor="true"
        className="min-w-0 bg-white min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:overflow-y-auto"
      >
        <section className="min-h-[470px] px-4 py-5 sm:px-5 min-[1280px]:pb-10">
          {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2 text-[10px] text-[#B83F2D]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0"><X className="size-3.5" /></button></div>}
          {activeSection === "overview" ? (
            <div>
              <div className="flex flex-col items-start justify-between gap-3 min-[560px]:flex-row min-[560px]:items-end">
                <div>
                  <p className="pf-eyebrow">Overview</p>
                  <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.035em]">Character blueprint</h2>
                  <p className="mt-1 max-w-xl text-[10px] leading-4 text-[#858681]">Review every selected attribute before saving or copy the full prompt for another workflow.</p>
                </div>
                <button onClick={copyPrompt} className="pf-button-secondary shrink-0"><Copy className="size-3.5" /> Copy prompt</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1460px]:grid-cols-2">
                {CHARACTER_ATTRIBUTE_SECTIONS.map((section) => (
                  <button key={section.id} onClick={() => setActiveSection(section.id)} className="pf-card p-3 text-left transition hover:-translate-y-px hover:border-[#BFC0B8] hover:shadow-sm motion-reduce:transform-none">
                    <span className="flex items-center justify-between"><b className="text-[10px]">{section.label}</b><ChevronRight className="size-3 text-[#999A95]" /></span>
                    <span className="mt-1.5 block text-[11px] leading-4 text-[#858681]">{section.groups.map((group) => `${group.label}: ${attributes[group.key]}`).join(" · ")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : active ? (
            <div>
              <div>
                <p className="pf-eyebrow">Editing attributes</p>
                <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.035em]">{active.label}</h2>
                <p className="mt-1 max-w-xl text-[10px] leading-4 text-[#858681]">Selections update the recipe immediately. Re-render to apply them to the photographic preview.</p>
              </div>
              <div className="mt-4 space-y-4">
                {active.groups.map((group) => (
                  <fieldset key={group.key}>
                    <legend className="mb-1.5 flex w-full items-center justify-between gap-3 text-[10px] font-semibold">
                      <span>{group.label}</span>
                      <span className="truncate text-[11px] font-medium text-[#858681]">
                        {group.key === "lipFullness" ? `${attributes[group.key]}%` : attributes[group.key]}
                      </span>
                    </legend>
                    {group.key === "lipFullness" ? (
                      <div className="rounded-[8px] border border-[#E1E2DC] bg-[#FAFAF8] px-3 py-2.5">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={attributes[group.key] ?? "72"}
                          onChange={(event) => selectAttribute(group.key, event.target.value)}
                          aria-label="Lip fullness"
                          className="h-1.5 w-full cursor-pointer accent-[#FF4A20]"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[#92938E]"><span>0%</span><span>100%</span></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 min-[1280px]:grid-cols-2 min-[1380px]:grid-cols-3">
                        {group.options.map((option) => {
                          const selected = attributes[group.key] === option;
                          return (
                            <button
                              type="button"
                              key={option}
                              aria-pressed={selected}
                              onClick={() => selectAttribute(group.key, option)}
                              className={cn(
                                "relative min-h-[38px] rounded-[8px] border px-2.5 py-1.5 text-left text-[10px] leading-4 transition-colors",
                                selected
                                  ? "border-[#378EFF] bg-[#F5F8FF] pr-7 font-semibold text-[#232323] shadow-[0_0_0_1px_#378EFF]"
                                  : "border-[#E1E2DC] bg-[#FAFAF8] text-[#62635F] hover:border-[#BFC0B8] hover:bg-white"
                              )}
                            >
                              {option}
                              {selected && <span className="absolute right-2 top-1/2 grid size-4 -translate-y-1/2 place-items-center rounded-full bg-[#378EFF] text-white"><Check className="size-2.5" /></span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>

      {importOpen && <div className="pf-safe-overlay fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-character-title"><div className="max-h-full min-w-0 w-full max-w-lg overflow-y-auto rounded-[16px] bg-white p-5 shadow-2xl"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="pf-eyebrow">Import</p><h2 id="import-character-title" className="mt-1 break-words text-lg font-semibold">Paste a prompt or attributes JSON</h2><p className="mt-1 break-words text-[10px] leading-4 text-[#858681]">Recognized fields are merged into the current character. Everything else is ignored.</p></div><button onClick={() => setImportOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full border border-[#DADBD2]"><X className="size-3.5" /></button></div><textarea value={importValue} onChange={(event) => setImportValue(event.target.value)} className="mt-4 h-52 w-full min-w-0 resize-none rounded-[9px] border border-[#DADBD2] bg-[#FAFAF8] p-3 font-mono text-[10px] leading-5 outline-none focus:border-[#FF4A20]" placeholder={'{"gender":"Female","age":"25-30","freckles":"Light Subtle"}'} /><div className="mt-4 flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end"><button onClick={() => setImportOpen(false)} className="pf-button-secondary">Cancel</button><button onClick={applyImport} className="pf-button-primary"><Download className="size-3.5" /> Import attributes</button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-[9px] bg-[#232323] px-3 py-2.5 text-[10px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[#69D583]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}
