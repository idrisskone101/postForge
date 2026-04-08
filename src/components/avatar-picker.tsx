"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { getModelsByType } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

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

type AvatarTab = "library" | "upload" | "generate" | "gallery";

interface GalleryFile {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
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

const TABS: Array<{ id: AvatarTab; label: string }> = [
  { id: "library", label: "Library" },
  { id: "upload", label: "Upload" },
  { id: "generate", label: "Generate" },
  { id: "gallery", label: "Gallery" },
];

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<AvatarTab>("library");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState("nano-banana");
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genJob, setGenJob] = useState<JobResult | null>(null);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);

  const [galleryFiles, setGalleryFiles] = useState<GalleryFile[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);

  const imageModels = getModelsByType("image");
  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId) ?? null;
  const isGenerating = Boolean(
    genJobId && (!genJob || genJob.status === "queued" || genJob.status === "processing")
  );
  const isCompleted = genJob?.status === "completed" && genJob.outputs.length > 0;
  const isFailed = genJob?.status === "failed";

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

  useEffect(() => {
    if (activeTab !== "gallery") return;
    if (galleryFiles.length > 0) return;

    setIsLoadingGallery(true);
    apiGet<GalleryFile[]>("/api/files?type=image&limit=50")
      .then(setGalleryFiles)
      .catch((err) => console.error("Failed to load gallery:", err))
      .finally(() => setIsLoadingGallery(false));
  }, [activeTab, galleryFiles.length]);

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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      setActiveTab("library");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await apiDelete(`/api/avatars/${id}`);
      setAvatars((prev) => prev.filter((avatar) => avatar.id !== id));
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

  const resetGeneration = () => {
    setGenJobId(null);
    setGenJob(null);
  };

  const handleSaveGenerated = async (fileId: string) => {
    setIsSavingGenerated(true);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: genPrompt.slice(0, 40) || "AI Avatar",
      });
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
      setActiveTab("library");
      setGenPrompt("");
      resetGeneration();
    } catch (err) {
      console.error("Failed to save avatar:", err);
    } finally {
      setIsSavingGenerated(false);
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
      setActiveTab("library");
    } catch (err) {
      console.error("Failed to save gallery image as avatar:", err);
    } finally {
      setSavingFileId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-[22px] border border-accent-blue/20 bg-accent-blue/5 px-3 py-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-accent-blue" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Best results:</span> Use a clear, front-facing portrait with even lighting and a clean background. Keep it to one person.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="rounded-[24px] border border-border/70 bg-background/35 p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-border/70 bg-muted">
            {selectedAvatar ? (
              <img src={`/api/avatars/${selectedAvatar.id}`} alt={selectedAvatar.name} className="size-full object-cover" />
            ) : (
              <User className="size-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Selected Avatar
            </p>
            <h3 className="mt-1.5 truncate text-base font-semibold">
              {selectedAvatar ? selectedAvatar.name : "No avatar selected yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep one face selected while you iterate on references and clones.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AvatarTab)} className="gap-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-[20px] bg-background/40 p-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-w-max rounded-[14px] px-3 py-2 text-xs font-semibold"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-[22px] bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {avatars.map((avatar) => {
                const isSelected = selectedId === avatar.id;

                return (
                  <div
                    key={avatar.id}
                    className={cn(
                      "group relative overflow-hidden rounded-[22px] border-2 transition-all",
                      isSelected
                        ? "border-accent-green shadow-[0_0_0_2px_rgba(123,165,67,0.2)]"
                        : "border-border hover:border-accent-green/40"
                    )}
                  >
                    <button type="button" onClick={() => onSelect(avatar.id)} className="block size-full text-left">
                      <div className="aspect-square overflow-hidden">
                        <img src={`/api/avatars/${avatar.id}`} alt={avatar.name} className="size-full object-cover" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10">
                        <p className="truncate text-xs font-semibold text-white">{avatar.name}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(event) => handleDelete(avatar.id, event)}
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>

                    {isSelected ? (
                      <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-green">
                        In use
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {avatars.length === 0 ? (
                <div className="col-span-3 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/20 px-4 py-8 text-center text-muted-foreground">
                  <User className="mb-3 size-8" />
                  <p className="text-sm font-medium text-foreground">No avatars yet</p>
                  <p className="mt-1 text-xs">Upload one, generate one, or import from your gallery.</p>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <div className="rounded-[26px] border border-border/70 bg-background/20 p-5">
            <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-background/30 px-6 py-10 text-center">
              {isUploading ? <Loader2 className="size-8 animate-spin text-accent-green" /> : <Upload className="size-8 text-accent-green" />}
              <div>
                <p className="text-sm font-semibold">Upload a portrait</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG or PNG works well. Once it uploads, it becomes the selected avatar automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-full bg-accent-green px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(123,165,67,0.24)] transition hover:brightness-110 disabled:opacity-60"
              >
                {isUploading ? "Uploading..." : "Choose Image"}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="generate">
          <div className="space-y-4 rounded-[26px] border border-border/70 bg-background/20 p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Prompt
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">{genPrompt.length}/500</span>
              </div>
              <Textarea
                placeholder="Describe the person: age, expression, hair, skin tone, outfit..."
                value={genPrompt}
                onChange={(event) => setGenPrompt(event.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[110px] resize-none rounded-[22px] border border-border bg-muted/50 p-4 text-sm transition-all focus:border-accent-green/30 focus:bg-card"
              />
              <p className="text-[11px] text-muted-foreground">
                Studio-lighting and clean-background modifiers are appended automatically for better motion-control references.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Model
              </label>
              <div className="flex flex-wrap gap-2">
                {imageModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setGenModel(model.id)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      genModel === model.id
                        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            </div>

            {!genJobId ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!genPrompt.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-green px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(123,165,67,0.24)] transition hover:brightness-110 disabled:opacity-50"
              >
                <Sparkles className="size-4" />
                Generate Avatar
              </button>
            ) : null}

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-border/70 bg-background/30 px-6 py-10 text-center">
                <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
                <p className="mt-4 text-sm font-semibold">Generating avatar</p>
                <p className="mt-1 text-xs text-muted-foreground">This stays inline so you can keep your workspace context.</p>
              </div>
            ) : null}

            {isFailed ? (
              <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 px-4 py-4">
                <p className="text-sm font-semibold text-destructive">Generation failed</p>
                <p className="mt-1 text-xs text-destructive/80">{genJob?.error ?? "Please try again."}</p>
                <button
                  type="button"
                  onClick={resetGeneration}
                  className="mt-3 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {isCompleted ? (
              <div className="space-y-4 rounded-[24px] border border-border/70 bg-background/30 p-4">
                <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[22px] border border-accent-green/30">
                  <img
                    src={`/api/files/${genJob.outputs[0].id}`}
                    alt="Generated avatar"
                    className="aspect-square size-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetGeneration}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <X className="size-4" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveGenerated(genJob.outputs[0].id)}
                    disabled={isSavingGenerated}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-green px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isSavingGenerated ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Use as Avatar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="gallery">
          <div className="rounded-[26px] border border-border/70 bg-background/20 p-5">
            {isLoadingGallery ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-square animate-pulse rounded-[22px] bg-muted" />
                ))}
              </div>
            ) : galleryFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/20 px-4 py-10 text-center text-muted-foreground">
                <ImageIcon className="mb-3 size-8" />
                <p className="text-sm font-medium text-foreground">No generated images yet</p>
                <p className="mt-1 text-xs">Generate some images in PostForge and import them here as avatars.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {galleryFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handlePickFromGallery(file.id)}
                    disabled={savingFileId === file.id}
                    className="group relative overflow-hidden rounded-[22px] border border-border/70 transition-all hover:border-accent-green/30"
                  >
                    <div className="aspect-square">
                      <img src={`/api/files/${file.id}`} alt={file.filename} className="size-full object-cover" />
                    </div>
                    {savingFileId === file.id ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                        <Loader2 className="size-6 animate-spin text-white" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-accent-green/0 transition-colors group-hover:bg-accent-green/10">
                        <Check className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
