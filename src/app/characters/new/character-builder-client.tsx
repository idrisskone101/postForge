"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2, X } from "lucide-react";
import {
  buildCharacterImagePrompt,
  buildCharacterPrompt,
  characterRecipeFingerprint,
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
  randomCharacterAttributes,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { apiPost } from "@/lib/api/client";
import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import {
  CharacterAttributeEditor,
  type CharacterAttributeEditorViewModel,
} from "./character-attribute-editor";
import {
  CharacterBuilderHeader,
  type CharacterBuilderHeaderViewModel,
} from "./character-builder-header";
import { CharacterCategoryRail } from "./character-category-rail";
import { parseImportedCharacterAttributes } from "./character-import";
import { saveCharacterAvatar, waitForCharacterPreview } from "./character-preview";
import {
  CharacterPreviewStage,
  type CharacterPreviewStageViewModel,
} from "./character-preview-stage";

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
  const [previewFingerprint, setPreviewFingerprint] = useState<string | null>(null);
  const [previewIsPhotographic, setPreviewIsPhotographic] = useState(false);
  const [rendering, setRendering] = useState(false);
  const renderingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
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
  const previewRequiresRender = previewIsPhotographic || Boolean(previewFileId);
  const previewHasSource = Boolean(
    previewFileId || (previewIsPhotographic && avatarId)
  );
  const readyPreviewFingerprint =
    !previewDirty && previewHasSource && previewFingerprint
      ? previewFingerprint
      : null;
  const previewSaveBlocked = previewRequiresRender && !readyPreviewFingerprint;
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

  async function renderPreview(
    requestedAttributes: CharacterAttributes,
    successMessage = "Photographic preview updated"
  ) {
    if (renderingRef.current) return;
    renderingRef.current = true;
    const requestedFingerprint = characterRecipeFingerprint(requestedAttributes);
    setRendering(true);
    setError(null);
    try {
      const job = await apiPost<{ id: string }>("/api/generate/images", {
        prompt: buildCharacterImagePrompt(requestedAttributes),
        aspectRatio: "3:4",
        numImages: 1,
        negativePrompt:
          "video game character, CGI, 3D render, digital art, illustration, synthetic person, plastic skin, beauty filter, uncanny symmetry, colored rim light, text, caption, logo, watermark, collage, extra people, duplicate face, cropped head, conflicting identity traits",
        characterPreview: true,
        characterRecipeFingerprint: requestedFingerprint,
      });
      const generatedFileId = await waitForCharacterPreview(job.id);
      setPreviewFileId(generatedFileId);
      setPreviewFingerprint(requestedFingerprint);
      setPreviewSeed((value) => value + 1);
      notify(successMessage);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to generate character preview"
      );
    } finally {
      renderingRef.current = false;
      setRendering(false);
    }
  }

  async function randomizeAndRender() {
    if (renderingRef.current) return;
    const randomizedAttributes = randomCharacterAttributes();
    setAttributes(randomizedAttributes);
    await renderPreview(
      randomizedAttributes,
      "Character randomized and preview updated"
    );
  }

  async function rerender() {
    await renderPreview(attributes);
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
    if (savingRef.current || renderingRef.current) return;
    if (missingEditRecord) {
      setError("This edit link no longer points to a saved character.");
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Add a character name before saving.");
      return;
    }
    if (previewSaveBlocked) {
      setError("Re-render preview so the saved photo matches the current recipe.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const now = new Date().toISOString();
    const record: CharacterRecord = {
      id: recordId,
      name: cleanName,
      attributes,
      previewSeed,
      avatarId,
      previewKind: readyPreviewFingerprint ? "photographic" : undefined,
      previewFingerprint: readyPreviewFingerprint,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const existing = await fetchWorkspaceFeature<CharacterRecord>("characters");
      const previous = existing.records.find((candidate) => candidate.id === recordId);
      if (previous?.createdAt) record.createdAt = previous.createdAt;
      if (readyPreviewFingerprint) {
        record.avatarId = await saveCharacterAvatar({
          currentAvatarId: avatarId ?? previous?.avatarId ?? null,
          characterId: recordId,
          name: cleanName,
          attributes,
          previewSeed,
          previewFingerprint: readyPreviewFingerprint,
          previewSourceUrl,
        });
        setAvatarId(record.avatarId);
        setPreviewIsPhotographic(true);
      } else {
        record.avatarId = null;
        setAvatarId(null);
        setPreviewIsPhotographic(false);
      }
      await saveWorkspaceFeature("characters", record);
      notify(
        readyPreviewFingerprint
          ? "Character saved and added to reusable avatars"
          : "Character saved as a draft"
      );
      window.setTimeout(() => router.push("/characters"), 350);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save character");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="pf-content-viewport grid place-items-center"><Loader2 className="size-7 animate-spin text-[var(--pf-orange)]" /></div>;
  }

  const headerView: CharacterBuilderHeaderViewModel = {
    editId,
    name,
    saving,
    rendering,
    missingEditRecord,
    previewSaveBlocked,
    readyPreviewFingerprint,
    onNameChange: setName,
    randomizeAndRender,
    onImport: () => setImportOpen(true),
    copyAttributes,
    saveCharacter,
  };
  const previewView: CharacterPreviewStageViewModel = {
    name,
    attributes,
    avatarId,
    previewFileId,
    previewIsPhotographic,
    rendering,
    saving,
    previewRequiresRender,
    previewSaveBlocked,
    rerender,
    randomizeAndRender,
    onLoadError: () => {
      if (!previewFileId) return;
      setPreviewFileId(null);
      setPreviewFingerprint(null);
      setError(
        previewIsPhotographic
          ? "The generated preview image could not be loaded. Re-render the preview before saving."
          : "The generated preview image could not be loaded. Re-render it or save this character as a draft."
      );
    },
  };
  const attributeView: CharacterAttributeEditorViewModel = {
    attributes,
    activeSection,
    active,
    error,
    onDismissError: () => setError(null),
    onSelectSection: setActiveSection,
    copyPrompt,
    selectAttribute,
  };

  return (
    <div
      data-character-workbench="true"
      className="pf-content-viewport bg-[var(--pf-canvas)] min-[1280px]:grid min-[1280px]:h-dvh min-[1280px]:min-h-0 min-[1280px]:grid-cols-[200px_minmax(420px,1.2fr)_minmax(360px,0.8fr)] min-[1280px]:grid-rows-[64px_minmax(0,1fr)] min-[1280px]:overflow-hidden"
    >
      <CharacterBuilderHeader view={headerView} />
      <CharacterCategoryRail
        attributes={attributes}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />
      <CharacterPreviewStage view={previewView} />
      <CharacterAttributeEditor view={attributeView} />

      {importOpen && <div className="pf-safe-overlay fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-character-title"><div className="max-h-full min-w-0 w-full max-w-lg overflow-y-auto rounded-[12px] bg-white p-5 shadow-2xl"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 id="import-character-title" className="mt-1 break-words text-[15px] font-semibold">Paste a prompt or attributes JSON</h2><p className="mt-1 break-words text-[12px] leading-4 text-muted-foreground">Recognized fields are merged into the current character. Everything else is ignored.</p></div><button onClick={() => setImportOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full border border-border"><X className="size-3.5" /></button></div><textarea value={importValue} onChange={(event) => setImportValue(event.target.value)} className="mt-4 h-52 w-full min-w-0 resize-none rounded-lg border border-border bg-card p-3 font-mono text-[12px] leading-5 outline-none focus:border-[var(--pf-orange)]" placeholder={'{"gender":"Female","age":"25-30","freckles":"Light Subtle"}'} /><div className="mt-4 flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end"><button onClick={() => setImportOpen(false)} className="pf-button-secondary">Cancel</button><button onClick={applyImport} className="pf-button-primary"><Download className="size-3.5" /> Import attributes</button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}


function makeCharacterId() {
  return `character_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}