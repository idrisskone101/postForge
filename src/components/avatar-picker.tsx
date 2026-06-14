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
} from "lucide-react";

// Auto-prepended to avatar generation prompts for optimal motion control reference images
const AVATAR_PROMPT_PREFIX =
  "Professional headshot portrait, front-facing or slight 3/4 angle, studio lighting, clean neutral background, high resolution, photorealistic, sharp focus, ";

interface Avatar {
  id: string;
  name: string;
  createdAt: string;
}

interface AvatarPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Mode = "grid" | "generate" | "gallery";

interface GalleryFile {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export function getAvatarOptionLabel(index: number): string {
  return `Identity ${index + 1}`;
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

  // Grid mode (default)
  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId);
  const primaryAvatars = (
    selectedAvatar
      ? [selectedAvatar, ...avatars.filter((avatar) => avatar.id !== selectedAvatar.id)]
      : avatars
  ).slice(0, 2);
  const secondaryAvatars = avatars.filter(
    (avatar) => !primaryAvatars.some((primaryAvatar) => primaryAvatar.id === avatar.id)
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {primaryAvatars.map((avatar, index) => {
          const isSelected = selectedId === avatar.id;
          const avatarLabel = getAvatarOptionLabel(index);
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

        {primaryAvatars.length === 0 && (
          <div className="flex min-h-[168px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-6 text-white/40">
            <User className="mb-2 size-7" />
            <p className="text-xs font-semibold">No saved identities yet</p>
          </div>
        )}

        <div className="flex min-h-[168px] flex-col rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Sparkles className="size-6 text-white/25" />
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-white/45">
              New Identity
            </p>
            <p className="mt-1 text-[10px] leading-4 text-white/25">
              Upload, generate, or import from gallery.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              data-avatar-action="upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-green hover:text-accent-green disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              <span className="text-[8px] font-bold uppercase tracking-wide">Upload</span>
            </button>

            <button
              type="button"
              data-avatar-action="generate"
              onClick={() => setMode("generate")}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-blue hover:text-accent-blue"
            >
              <Sparkles className="size-4" />
              <span className="text-[8px] font-bold uppercase tracking-wide">Generate</span>
            </button>

            <button
              type="button"
              data-avatar-action="gallery"
              onClick={openGallery}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-accent-coral hover:text-accent-coral"
            >
              <ImageIcon className="size-4" />
              <span className="text-[8px] font-bold uppercase tracking-wide">Gallery</span>
            </button>
          </div>
        </div>
      </div>

      {secondaryAvatars.length > 0 && (
        <div className="grid max-h-24 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
          {secondaryAvatars.map((avatar, index) => {
            const avatarLabel = getAvatarOptionLabel(primaryAvatars.length + index);
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onSelect(avatar.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border bg-black transition-colors hover:border-accent-green/50",
                  selectedId === avatar.id ? "border-accent-green" : "border-white/10"
                )}
                title={avatarLabel}
                aria-label={`Select ${avatarLabel}`}
              >
                <img
                  src={`/api/avatars/${avatar.id}`}
                  alt={avatarLabel}
                  className="size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-left text-[9px] font-medium text-white">
                  <span className="block truncate">{avatarLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
