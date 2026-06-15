"use client";

import { useState, useEffect, useRef } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { getModelsByType } from "@/lib/ai/models";
import {
  Trash2,
  Loader2,
  User,
  Sparkles,
  Upload,
  ArrowLeft,
  X,
  Check,
  Image as ImageIcon,
  FileJson,
} from "lucide-react";

// Auto-prepended to avatar generation prompts for optimal motion control reference images
const AVATAR_PROMPT_PREFIX =
  "Professional headshot portrait, front-facing or slight 3/4 angle, studio lighting, clean neutral background, high resolution, photorealistic, sharp focus, ";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Seed Reference Image could not be read."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Seed Reference Image could not be read."));
    reader.readAsDataURL(file);
  });
}

interface Avatar {
  id: string;
  name: string;
  createdAt: string;
}

interface AvatarPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Mode = "grid" | "generate" | "gallery" | "import";

interface GalleryFile {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface AvatarSeedReferenceImage {
  name: string;
  size: number;
  type: string;
}

export function getAvatarOptionLabel(index: number): string {
  return `Identity ${index + 1}`;
}

export function getAvatarImportReadiness(rawJson: string, seedReferenceImageCount: number) {
  let jsonError: string | null = null;
  let seedError: string | null = null;

  try {
    JSON.parse(rawJson);
  } catch {
    jsonError = "Avatar Profile must be valid JSON.";
  }

  if (seedReferenceImageCount < 1) {
    seedError = "Add at least 1 Seed Reference Image.";
  } else if (seedReferenceImageCount > 5) {
    seedError = "Use no more than 5 Seed Reference Images.";
  }

  return {
    canGenerateCandidates: !jsonError && !seedError,
    jsonError,
    seedError,
  };
}

export function getDefaultAvatarImportName(rawJson: string): string {
  try {
    const profile = JSON.parse(rawJson) as { name?: unknown; displayName?: unknown };
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    if (name) return name.slice(0, 40);

    const displayName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
    if (displayName) return displayName.slice(0, 40);
  } catch {
    return "Imported Avatar";
  }

  return "Imported Avatar";
}

export interface AvatarCandidateGenerationRequest {
  prompt: string;
  model: "nano-banana-2";
  aspectRatio: "9:16";
  numImages: 3;
  referenceImageUrls: string[];
}

export interface AvatarCandidateArtifact {
  fileId: string;
}

export interface AvatarCandidateSet {
  jobId: string;
  candidates: AvatarCandidateArtifact[];
}

export interface AvatarImportDraft {
  rawJson: string;
  seedReferenceImages: AvatarSeedReferenceImage[];
  candidateSets: AvatarCandidateSet[];
  generationError: string | null;
}

export function appendAvatarCandidateSet(
  currentSets: AvatarCandidateSet[],
  nextSet: AvatarCandidateSet
): AvatarCandidateSet[] {
  return [...currentSets, nextSet];
}

export function resetAvatarImportDraft(): AvatarImportDraft {
  return {
    rawJson: "",
    seedReferenceImages: [],
    candidateSets: [],
    generationError: null,
  };
}

export function buildAvatarCandidateGenerationRequest({
  rawJson,
  seedReferenceImageUrls,
}: {
  rawJson: string;
  seedReferenceImageUrls: string[];
}): AvatarCandidateGenerationRequest {
  const profile = JSON.parse(rawJson);

  return {
    model: "nano-banana-2",
    aspectRatio: "9:16",
    numImages: 3,
    referenceImageUrls: seedReferenceImageUrls,
    prompt: [
      "Generate clean portrait source images for Avatar Candidate review.",
      "Preserve the same stable core identity from the Avatar Profile and Seed Reference Images.",
      "Vary only presentation lightly with simple varied backgrounds.",
      "Use all provided Seed Reference Images as the identity reference set for every candidate.",
      "No bedroom scenes, no lifestyle scenes, no busy environment, no full-body editorial setup.",
      `Avatar Profile JSON: ${JSON.stringify(profile)}`,
    ].join(" "),
  };
}

interface AvatarCreationCardProps {
  isUploading: boolean;
  onUpload: () => void;
  onGenerate: () => void;
  onGallery: () => void;
  onImport: () => void;
}

export function AvatarCreationCard({
  isUploading,
  onUpload,
  onGenerate,
  onGallery,
  onImport,
}: AvatarCreationCardProps) {
  return (
    <div className="flex min-h-[168px] flex-col rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg bg-black/20 text-center">
        <Sparkles className="size-6 text-white/25" />
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-white/45">
          New Avatar
        </p>
        <p className="mt-1 text-[10px] leading-4 text-white/25">
          Upload, generate, import, or choose from gallery.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          data-avatar-action="upload"
          onClick={onUpload}
          disabled={isUploading}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-green hover:text-accent-green disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="text-[8px] font-bold uppercase tracking-wide">Upload</span>
        </button>

        <button
          type="button"
          data-avatar-action="generate"
          onClick={onGenerate}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-blue hover:text-accent-blue"
        >
          <Sparkles className="size-4" />
          <span className="text-[8px] font-bold uppercase tracking-wide">Generate</span>
        </button>

        <button
          type="button"
          data-avatar-action="import"
          onClick={onImport}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-green hover:text-accent-green"
        >
          <FileJson className="size-4" />
          <span className="text-[8px] font-bold uppercase tracking-wide">Import</span>
        </button>

        <button
          type="button"
          data-avatar-action="gallery"
          onClick={onGallery}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-coral hover:text-accent-coral"
        >
          <ImageIcon className="size-4" />
          <span className="text-[8px] font-bold uppercase tracking-wide">Gallery</span>
        </button>
      </div>
    </div>
  );
}

interface AvatarImportPanelProps {
  rawJson: string;
  avatarName?: string;
  seedReferenceImages: AvatarSeedReferenceImage[];
  candidateSets?: AvatarCandidateSet[];
  isGeneratingCandidates: boolean;
  generationError: string | null;
  onBack: () => void;
  onAvatarNameChange?: (value: string) => void;
  onRawJsonChange: (value: string) => void;
  onJsonFileChange: (files: FileList | null) => void;
  onSeedReferenceImagesChange: (files: FileList | null) => void;
  onRemoveSeedReferenceImage: (index: number) => void;
  onGenerateCandidates: () => void;
  onAcceptCandidate?: (fileId: string) => void;
}

export function AvatarImportPanel({
  rawJson,
  avatarName,
  seedReferenceImages,
  candidateSets = [],
  isGeneratingCandidates,
  generationError,
  onBack,
  onAvatarNameChange,
  onRawJsonChange,
  onJsonFileChange,
  onSeedReferenceImagesChange,
  onRemoveSeedReferenceImage,
  onGenerateCandidates,
  onAcceptCandidate,
}: AvatarImportPanelProps) {
  const readiness = getAvatarImportReadiness(rawJson, seedReferenceImages.length);
  const resolvedAvatarName = avatarName ?? getDefaultAvatarImportName(rawJson);
  const candidateCount = candidateSets.reduce(
    (total, set) => total + set.candidates.length,
    0
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to avatars
      </button>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
            <FileJson className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Import Avatar</h3>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Add raw Avatar Profile JSON and 1 to 5 Seed Reference Images.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-white/45">
          Avatar name
        </label>
        <input
          type="text"
          value={resolvedAvatarName}
          onChange={(event) => onAvatarNameChange?.(event.target.value)}
          maxLength={40}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white/80 outline-none transition-colors placeholder:text-white/25 focus:border-accent-green/45"
          placeholder="Imported Avatar"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-white/45">
            Avatar Profile JSON
          </label>
          <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55 transition-colors hover:border-accent-green hover:text-accent-green">
            Upload JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => onJsonFileChange(event.target.files)}
            />
          </label>
        </div>
        <Textarea
          value={rawJson}
          onChange={(event) => onRawJsonChange(event.target.value)}
          placeholder={`{
  "name": "Imported Avatar"
}`}
          className="min-h-[160px] resize-y rounded-xl border-white/10 bg-black/20 font-mono text-xs text-white/75 placeholder:text-white/25"
        />
        {readiness.jsonError && (
          <p className="text-xs font-medium text-destructive">{readiness.jsonError}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-white/45">
            Seed Reference Images
          </label>
          <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55 transition-colors hover:border-accent-green hover:text-accent-green">
            Upload Images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => onSeedReferenceImagesChange(event.target.files)}
            />
          </label>
        </div>

        {seedReferenceImages.length > 0 ? (
          <div className="space-y-2">
            {seedReferenceImages.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/75">{file.name}</p>
                  <p className="text-[10px] text-white/35">{file.type || "image"} · {Math.round(file.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSeedReferenceImage(index)}
                  aria-label={`Remove ${file.name}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-white/35">
            Upload 1 to 5 Seed Reference Images.
          </div>
        )}

        {readiness.seedError && (
          <p className="text-xs font-medium text-destructive">{readiness.seedError}</p>
        )}
      </div>

      {generationError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {generationError}
        </div>
      )}

      {candidateCount > 0 && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Avatar Candidates</h4>
              <p className="mt-1 text-xs text-white/40">
                Review generated candidates before saving one as an Avatar.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateCandidates}
              disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
              className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/55 transition-colors hover:border-accent-green hover:text-accent-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              Regenerate Candidates
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {candidateSets.flatMap((set) => set.candidates).map((candidate, index) => (
              <div
                key={candidate.fileId}
                className="overflow-hidden rounded-lg border border-white/10 bg-black/20"
              >
                <div className="aspect-[3/4] bg-black">
                  <img
                    src={`/api/files/${candidate.fileId}`}
                    alt={`Candidate ${index + 1}`}
                    className="size-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                    Candidate {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAcceptCandidate?.(candidate.fileId)}
                    className="w-full rounded-md bg-accent-green px-2 py-1.5 text-[10px] font-semibold text-white transition-all hover:brightness-110"
                  >
                    Use Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerateCandidates}
        disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGeneratingCandidates ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate candidates
      </button>
    </div>
  );
}

interface JobResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  outputs: {
    id: string;
    type: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  }[];
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<Mode>("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate state
  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState("nano-banana");
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genJob, setGenJob] = useState<JobResult | null>(null);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);

  // Gallery state
  const [galleryFiles, setGalleryFiles] = useState<GalleryFile[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);

  // Import state
  const [importRawJson, setImportRawJson] = useState("");
  const [importAvatarName, setImportAvatarName] = useState("Imported Avatar");
  const [seedReferenceImages, setSeedReferenceImages] = useState<File[]>([]);
  const [avatarCandidateSets, setAvatarCandidateSets] = useState<AvatarCandidateSet[]>([]);
  const [importCandidateJobId, setImportCandidateJobId] = useState<string | null>(null);
  const [isGeneratingImportCandidates, setIsGeneratingImportCandidates] = useState(false);
  const [importGenerationError, setImportGenerationError] = useState<string | null>(null);

  const imageModels = getModelsByType("image");

  const fetchAvatars = async () => {
    try {
      const data = await apiGet<Avatar[]>("/api/avatars");
      setAvatars(data);
    } catch (err) {
      console.error("Failed to load avatars:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));

      const response = await fetch("/api/avatars", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const avatar = await response.json();
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDelete(`/api/avatars/${id}`);
      setAvatars((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) {
        onSelect("");
      }
    } catch (err) {
      console.error("Failed to delete avatar:", err);
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;

    try {
      // Auto-enhance prompt with quality modifiers for optimal motion control results
      const enhancedPrompt = AVATAR_PROMPT_PREFIX + genPrompt.trim();
      const result = await apiPost<{ id: string }>("/api/generate/images", {
        prompt: enhancedPrompt,
        model: genModel,
        aspectRatio: "1:1",
        numImages: 1,
      });
      setGenJobId(result.id);
    } catch (err) {
      console.error("Failed to start generation:", err);
    }
  };

  // Poll for generation job completion
  useEffect(() => {
    if (!genJobId) {
      setGenJob(null);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<JobResult>(`/api/jobs/${genJobId}`);
        if (!active) return;
        setGenJob(result);
        if (result.status !== "completed" && result.status !== "failed") {
          timeoutId = setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error("Failed to poll job:", err);
        if (active) {
          timeoutId = setTimeout(poll, 5000);
        }
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [genJobId]);

  const handleSaveGenerated = async (fileId: string) => {
    setIsSavingGenerated(true);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: genPrompt.slice(0, 40) || "AI Avatar",
      });
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
      // Reset generate state
      setMode("grid");
      setGenJobId(null);
      setGenPrompt("");
    } catch (err) {
      console.error("Failed to save avatar:", err);
    } finally {
      setIsSavingGenerated(false);
    }
  };

  const openGallery = async () => {
    setMode("gallery");
    setIsLoadingGallery(true);
    try {
      const files = await apiGet<GalleryFile[]>("/api/files?type=image&limit=50");
      setGalleryFiles(files);
    } catch (err) {
      console.error("Failed to load gallery:", err);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handlePickFromGallery = async (fileId: string) => {
    setSavingFileId(fileId);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: "Gallery Import",
      });
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
      setMode("grid");
    } catch (err) {
      console.error("Failed to save gallery image as avatar:", err);
    } finally {
      setSavingFileId(null);
    }
  };

  const resetGenerate = () => {
    setMode("grid");
    setGenJobId(null);
    setGenPrompt("");
  };

  const handleImportJsonFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setImportGenerationError(null);
    try {
      const rawJson = await file.text();
      setImportRawJson(rawJson);
      setImportAvatarName(getDefaultAvatarImportName(rawJson));
    } catch {
      setImportGenerationError("Avatar Profile JSON file could not be read.");
    }
  };

  const handleSeedReferenceImages = (files: FileList | null) => {
    if (!files) return;
    setImportGenerationError(null);
    setSeedReferenceImages((current) => [...current, ...Array.from(files)]);
  };

  const handleRemoveSeedReferenceImage = (index: number) => {
    setImportGenerationError(null);
    setSeedReferenceImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleGenerateImportCandidates = async () => {
    const readiness = getAvatarImportReadiness(importRawJson, seedReferenceImages.length);
    if (!readiness.canGenerateCandidates) return;

    setIsGeneratingImportCandidates(true);
    setImportGenerationError(null);
    try {
      const seedReferenceImageUrls = await Promise.all(
        seedReferenceImages.map(readFileAsDataUrl)
      );
      const result = await apiPost<{ id: string }>("/api/generate/images", buildAvatarCandidateGenerationRequest({
        rawJson: importRawJson,
        seedReferenceImageUrls,
      }));
      setImportCandidateJobId(result.id);
    } catch {
      setImportGenerationError("Candidate generation failed. Your inputs are still available for retry.");
      setIsGeneratingImportCandidates(false);
    }
  };

  useEffect(() => {
    if (!importCandidateJobId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<JobResult>(`/api/jobs/${importCandidateJobId}`);
        if (!active) return;

        if (result.status === "completed") {
          setAvatarCandidateSets((current) => appendAvatarCandidateSet(current, {
            jobId: result.id,
            candidates: result.outputs
              .filter((output) => output.type === "image")
              .map((output) => ({ fileId: output.id })),
          }));
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        if (result.status === "failed") {
          setImportGenerationError(
            result.error || "Candidate generation failed. Your inputs are still available for retry."
          );
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        timeoutId = setTimeout(poll, 3000);
      } catch {
        if (!active) return;
        timeoutId = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [importCandidateJobId]);

  const abandonImport = () => {
    const cleared = resetAvatarImportDraft();
    setImportRawJson(cleared.rawJson);
    setImportAvatarName("Imported Avatar");
    setSeedReferenceImages([]);
    setAvatarCandidateSets(cleared.candidateSets);
    setImportGenerationError(cleared.generationError);
    setImportCandidateJobId(null);
    setIsGeneratingImportCandidates(false);
    setMode("grid");
  };

  const handleAcceptImportCandidate = async (fileId: string) => {
    setIsSavingGenerated(true);
    try {
      const result = await apiPost<{ avatar: Avatar }>("/api/avatars/import-candidate", {
        fileId,
        name: importAvatarName,
        rawAvatarProfileJson: importRawJson,
        seedReferenceImages: seedReferenceImages.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        candidateFileIds: avatarCandidateSets.flatMap((set) =>
          set.candidates.map((candidate) => candidate.fileId)
        ),
      });
      setAvatars((prev) => [result.avatar, ...prev]);
      onSelect(result.avatar.id);
      abandonImport();
    } catch (err) {
      console.error("Failed to accept imported avatar candidate:", err);
      setImportGenerationError("Candidate could not be saved as an Avatar.");
    } finally {
      setIsSavingGenerated(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // Generate mode
  if (mode === "generate") {
    const isGenerating = genJobId && (!genJob || genJob.status === "queued" || genJob.status === "processing");
    const isCompleted = genJob?.status === "completed" && genJob.outputs.length > 0;
    const isFailed = genJob?.status === "failed";

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={resetGenerate}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to avatars
        </button>

        {!genJobId && (
          <>
            <Textarea
              placeholder="Describe the person: age, gender, hair, skin tone, expression. e.g. 'Woman in her late 20s, dark wavy hair, warm smile, light skin'"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value.slice(0, 500))}
              maxLength={500}
              className="min-h-[100px] resize-none bg-muted border-2 border-transparent focus:border-accent-green/30 focus:bg-card rounded-2xl p-4 text-sm transition-all"
            />
            <p className="text-[10px] text-muted-foreground">
              Quality modifiers (studio lighting, clean background, etc.) are added automatically.
            </p>

            {/* Model selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Model
              </label>
              <div className="flex flex-wrap gap-2">
                {imageModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGenModel(m.id)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                      genModel === m.id
                        ? "border-accent-green bg-accent-green/10 text-accent-green"
                        : "border-border text-muted-foreground hover:border-accent-green/50"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!genPrompt.trim()}
              className="w-full rounded-2xl bg-accent-green px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(123,165,67,0.25)] transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="size-4" />
              Generate Avatar
            </button>
          </>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
            <p className="text-sm font-medium">Generating avatar...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-sm text-destructive">Generation failed{genJob?.error ? `: ${genJob.error}` : ""}</p>
            <button
              type="button"
              onClick={() => setGenJobId(null)}
              className="text-sm text-accent-green hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Completed — show result and save button */}
        {isCompleted && genJob && (
          <div className="space-y-4">
            <div className="relative aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-accent-green">
              <img
                src={`/api/files/${genJob.outputs[0].id}`}
                alt="Generated avatar"
                className="size-full object-cover"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGenJobId(null)}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted flex items-center justify-center gap-2"
              >
                <X className="size-4" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => handleSaveGenerated(genJob.outputs[0].id)}
                disabled={isSavingGenerated}
                className="flex-1 rounded-2xl bg-accent-green px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingGenerated ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Use as Avatar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gallery mode
  if (mode === "gallery") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMode("grid")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to avatars
        </button>

        {isLoadingGallery ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : galleryFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ImageIcon className="size-8 mb-2" />
            <p className="text-sm">No generated images yet</p>
            <p className="text-xs mt-1">Generate some images first, then pick them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => handlePickFromGallery(file.id)}
                disabled={savingFileId === file.id}
                className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-border transition-all hover:border-accent-green/50"
              >
                <img
                  src={`/api/files/${file.id}`}
                  alt={file.filename}
                  className="size-full object-cover"
                />
                {savingFileId === file.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="size-6 text-white animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-accent-green/0 group-hover:bg-accent-green/10 transition-colors flex items-center justify-center">
                  <Check className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "import") {
    return (
      <AvatarImportPanel
        rawJson={importRawJson}
        avatarName={importAvatarName}
        seedReferenceImages={seedReferenceImages}
        candidateSets={avatarCandidateSets}
        isGeneratingCandidates={isGeneratingImportCandidates}
        generationError={importGenerationError}
        onBack={abandonImport}
        onAvatarNameChange={(value) => {
          setImportGenerationError(null);
          setImportAvatarName(value.slice(0, 40));
        }}
        onRawJsonChange={(value) => {
          setImportGenerationError(null);
          setImportRawJson(value);
          setImportAvatarName(getDefaultAvatarImportName(value));
        }}
        onJsonFileChange={handleImportJsonFile}
        onSeedReferenceImagesChange={handleSeedReferenceImages}
        onRemoveSeedReferenceImage={handleRemoveSeedReferenceImage}
        onGenerateCandidates={handleGenerateImportCandidates}
        onAcceptCandidate={handleAcceptImportCandidate}
      />
    );
  }

  // Grid mode (default)
  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId);
  const orderedAvatars = (
    selectedAvatar
      ? [selectedAvatar, ...avatars.filter((avatar) => avatar.id !== selectedAvatar.id)]
      : avatars
  );

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="grid max-h-[360px] grid-cols-2 gap-3 overflow-y-auto pr-1 lg:grid-cols-4">
        {orderedAvatars.map((avatar, index) => {
          const isSelected = selectedId === avatar.id;
          const sourceIndex = avatars.findIndex((candidate) => candidate.id === avatar.id);
          const avatarLabel = getAvatarOptionLabel(sourceIndex >= 0 ? sourceIndex : index);
          return (
            <div
              key={avatar.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-white/[0.03] p-2.5 transition-all",
                isSelected
                  ? "border-accent-green shadow-[0_0_0_2px_rgba(123,165,67,0.16)]"
                  : "border-white/10 hover:border-accent-green/45 hover:bg-white/[0.05]"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(avatar.id)}
                className="block w-full text-left"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-black">
                  <img
                    src={`/api/avatars/${avatar.id}`}
                    alt={avatarLabel}
                    className="size-full object-cover"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-white/85">
                    {avatarLabel}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-widest",
                      isSelected
                        ? "bg-accent-green/15 text-accent-green"
                        : "bg-white/5 text-white/35"
                    )}
                  >
                    {isSelected ? "Active" : "Select"}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(avatar.id, e)}
                className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
                aria-label={`Delete ${avatarLabel}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}

        {orderedAvatars.length === 0 && (
          <div className="flex min-h-[168px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-6 text-white/40">
            <User className="mb-2 size-7" />
            <p className="text-xs font-semibold">No saved identities yet</p>
          </div>
        )}

        <AvatarCreationCard
          isUploading={isUploading}
          onUpload={() => fileInputRef.current?.click()}
          onGenerate={() => setMode("generate")}
          onGallery={openGallery}
          onImport={() => setMode("import")}
        />
      </div>
    </div>
  );
}
