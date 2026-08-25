"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { CharacterAttributeEditorViewModel } from "./character-attribute-editor";
import type { CharacterBuilderHeaderViewModel } from "./character-builder-header";
import { parseImportedCharacterAttributes } from "./character-import";
import { saveCharacterAvatar, waitForCharacterPreview } from "./character-preview";
import type { CharacterPreviewStageViewModel } from "./character-preview-stage";

function makeCharacterId() {
  return `character_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useCharacterBuilder(editId: string | null = null) {
  const router = useRouter();
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
      : "/character-builder/default-portrait.webp";

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

  return {
    loading,
    attributes,
    activeSection,
    setActiveSection,
    headerView,
    previewView,
    attributeView,
    importOpen,
    setImportOpen,
    importValue,
    setImportValue,
    applyImport,
    toast,
  };
}
