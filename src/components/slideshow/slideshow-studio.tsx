"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";

import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { cn } from "@/lib/utils";
import { fetchPlatformCollections } from "@/lib/collections-client";
import { fetchModelsCatalog } from "@/lib/ai/models-client";

import {
  downloadSlideshowExport,
  fetchSlideshowProject,
  fetchSlideshowProjects,
  persistSlideshowProject,
  requestSlideshowCopyVariation,
  requestSlideshowCreatorVisuals,
  requestSlideshowImageGeneration,
  requestSlideshowStory,
  waitForCreatorVisuals,
} from "./api";
import {
  createBlankSlideshowProject,
  createProjectFromCreatorCopy,
  createProjectFromTemplate,
  DEFAULT_SLIDESHOW_TEMPLATES,
} from "./fixtures";
import { PublishDialog } from "./publish-dialog";
import { SlideshowEditor } from "./slideshow-editor";
import {
  CreateView,
  DraftsView,
  StudioSectionNav,
  TemplateDialog,
} from "./studio-views";
import type {
  SlideshowCollection,
  SlideshowImageGenerationResult,
  SlideshowProject,
  SlideshowPublishOptions,
  SlideshowSlide,
  SlideshowStudioProps,
  SlideshowTemplate,
} from "./types";

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const candidateWithClient = item as T & { clientId?: string };
  const index = items.findIndex(
    (candidate) => {
      const current = candidate as T & { clientId?: string };
      return (
        current.id === item.id ||
        (candidateWithClient.clientId !== undefined &&
          (current.id === candidateWithClient.clientId ||
            current.clientId === candidateWithClient.clientId)) ||
        (current.clientId !== undefined && current.clientId === item.id)
      );
    },
  );
  if (index < 0) return [item, ...items];
  const next = [...items];
  next[index] = item;
  return next;
}

export function SlideshowStudio({
  initialProjects,
  initialProject = null,
  initialSection = "create",
  templates = DEFAULT_SLIDESHOW_TEMPLATES,
  apiBaseUrl = "/api/slideshows",
  className,
  tiktokConnected = false,
  supportsMp4Export = false,
  onSaveProject,
  onRegenerateSlide,
  onRegenerateImage,
  onExportProject,
}: SlideshowStudioProps) {
  const [section, setSection] = useState(initialSection);
  const [projects, setProjects] = useState(initialProjects ?? []);
  const [collections, setCollections] = useState<SlideshowCollection[]>([]);
  const [activeProject, setActiveProject] = useState(initialProject);
  const [editorSession, setEditorSession] = useState(0);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [publishProject, setPublishProject] = useState<SlideshowProject | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(
    initialProjects === undefined,
  );
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [imageModels, setImageModels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void fetchModelsCatalog()
      .then((catalog) => {
        if (!active) return;
        const models = catalog.models.filter((model) => model.type === "image");
        setImageModels(models.map((model) => ({ id: model.id, name: model.name })));
        setSelectedImageModel((current) => current ?? catalog.defaults.image ?? models[0]?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialProjects !== undefined) return;
    let active = true;
    void fetchSlideshowProjects(apiBaseUrl)
      .then((loaded) => {
        if (active) setProjects(loaded);
      })
      .catch((error) => {
        if (active) {
          setProjectsError(
            error instanceof Error ? error.message : "Could not load slideshow drafts.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });
    return () => {
      active = false;
    };
  }, [apiBaseUrl, initialProjects]);

  useEffect(() => {
    let active = true;
    void fetchPlatformCollections()
      .then((loaded) => {
        if (!active) return;
        setCollections(
          loaded.map((collection) => ({
            id: collection.id,
            name: collection.name,
            imageCount: collection.imageCount,
            visualKeys: [],
            imageUrls: collection.imageUrls,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      initialProjects !== undefined ||
      section !== "drafts" ||
      activeProject
    ) {
      return;
    }
    let active = true;
    void fetchSlideshowProjects(apiBaseUrl)
      .then((loaded) => {
        if (active) {
          setProjects(loaded);
          setProjectsError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setProjectsError(
            error instanceof Error
              ? error.message
              : "Could not refresh slideshow drafts.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [activeProject, apiBaseUrl, initialProjects, section]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const openEditor = useCallback((project: SlideshowProject) => {
    setProjects((current) => upsertById(current, project));
    setActiveProject(project);
    setEditorSession((current) => current + 1);
  }, []);

  const startCustom = useCallback(() => {
    setTemplateOpen(false);
    openEditor(createBlankSlideshowProject());
  }, [openEditor]);

  const startTemplate = useCallback(
    (template: SlideshowTemplate) => {
      setTemplateOpen(false);
      openEditor(createProjectFromTemplate(template));
    },
    [openEditor],
  );

  const handleGenerateStory = useCallback(
    async (input: {
      idea: string;
      slideCount: number;
      language: string;
      includeCta: boolean;
      model?: string;
    }) => {
      setGeneratingStory(true);
      try {
        const project = await requestSlideshowStory(input, apiBaseUrl);
        openEditor(project);
        const providerLabel =
          project.generationProvider === "ollama"
            ? project.generationModel || "DeepSeek V4 Flash"
            : "local fallback";
        showToast(
          project.generationWarning
            ? `Local story fallback used: ${project.generationWarning}`
            : `Slideshow written with ${providerLabel}.`,
        );
      } finally {
        setGeneratingStory(false);
      }
    },
    [apiBaseUrl, openEditor, showToast],
  );

  const [generatingCreator, setGeneratingCreator] = useState(false);
  const [creatorProgress, setCreatorProgress] = useState<{
    title: string;
    completed: number;
    total: number;
  } | null>(null);

  const handleGenerateCreator = useCallback(
    async (input: {
      title: string;
      hook: string;
      slides: string[];
      template: unknown;
      collectionAssetIds: string[];
      model?: string;
      aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
    }) => {
      setGeneratingCreator(true);
      try {
        // 1. Build the deck from the operator's copy (verbatim), persist it to
        // get real ids.
        const local = createProjectFromCreatorCopy({
          hook: input.hook,
          slides: input.slides,
          title: input.title,
          aspectRatio: input.aspectRatio ?? "9:16",
        });
        const saved = await persistSlideshowProject(local, apiBaseUrl);

        // 2. Queue GPT Image 2 visuals for every slide.
        const visuals = await requestSlideshowCreatorVisuals(
          saved,
          saved.slides.map((slide) => ({
            slideId: slide.id,
            text: slide.headline || slide.prompt || "",
          })),
          input.template,
          apiBaseUrl,
          {
            model: input.model ?? "gpt-image-2",
            aspectRatio: input.aspectRatio ?? "9:16",
          },
        );

        const generating: SlideshowProject = {
          ...saved,
          status: "generating",
          revision: visuals.projectRevision,
          creator: {
            template: input.template,
            updatedAt: new Date().toISOString(),
          } as NonNullable<SlideshowProject["creator"]>,
        };
        setProjects((current) => upsertById(current, generating));

        // 3. Show a loading screen while the visuals are generated, so the
        // operator isn't dropped into an empty editor before their images
        // exist. The overlay polls the queued jobs; failures are surfaced
        // after so they can retry the affected slide in the editor.
        if (visuals.jobs.length > 0) {
          setCreatorProgress({
            title: saved.title,
            completed: 0,
            total: visuals.jobs.length,
          });
          const { failed } = await waitForCreatorVisuals(
            visuals.jobs,
            (completed, total) =>
              setCreatorProgress((current) =>
                current && current.total === total
                  ? { ...current, completed }
                  : current,
              ),
          );

          // Re-fetch so the editor opens with the freshly generated images.
          const refreshed = await fetchSlideshowProject(saved.id, apiBaseUrl).catch(
            () => generating,
          );
          setActiveProject(refreshed);
          setProjects((current) => upsertById(current, refreshed));
          openEditor(refreshed);

          if (failed.length > 0) {
            showToast(
              `${failed.length} visual${failed.length === 1 ? "" : "s"} failed. Open the slide and tap Regenerate image to retry.`,
            );
          } else {
            showToast(
              `Generated ${visuals.jobs.length} visuals with GPT Image 2 (~$${visuals.estimatedCost.toFixed(2)}).`,
            );
          }
        } else {
          // No jobs were queued (provider rejected or zero slides) — open the
          // editor anyway so the draft is never orphaned.
          openEditor(generating);
          showToast("The draft was saved, but no visuals were queued.");
        }
      } finally {
        setGeneratingCreator(false);
        setCreatorProgress(null);
      }
    },
    [apiBaseUrl, openEditor, showToast],
  );

  const handleProjectChange = useCallback((project: SlideshowProject) => {
    setActiveProject(project);
    setProjects((current) => upsertById(current, project));
  }, []);

  const handleSaveProject = useCallback(
    async (project: SlideshowProject) => {
      const saved = onSaveProject
        ? await onSaveProject(project)
        : await persistSlideshowProject(project, apiBaseUrl);
      const resolved = saved
        ? {
            ...saved,
            clientId: saved.clientId ?? project.clientId ?? project.id,
          }
        : project;
      setProjects((current) =>
        upsertById(
          current.filter((candidate) => candidate.id !== project.id),
          resolved,
        ),
      );
      setActiveProject(resolved);
      return resolved;
    },
    [apiBaseUrl, onSaveProject],
  );

  const handleRegenerateSlide = useCallback(
    async (project: SlideshowProject, slide: SlideshowSlide) => {
      if (onRegenerateSlide) return onRegenerateSlide(project, slide);
      return requestSlideshowCopyVariation(project, slide, apiBaseUrl);
    },
    [apiBaseUrl, onRegenerateSlide],
  );

  const handleRegenerateImage = useCallback(
    async (
      project: SlideshowProject,
      slide: SlideshowSlide,
      onQueuedRevision: (revision: number) => void,
    ): Promise<SlideshowImageGenerationResult | void> => {
      if (onRegenerateImage) {
        return onRegenerateImage(project, slide, onQueuedRevision);
      }
      return requestSlideshowImageGeneration(
        project,
        slide,
        apiBaseUrl,
        onQueuedRevision,
        selectedImageModel ?? undefined,
      );
    },
    [apiBaseUrl, onRegenerateImage, selectedImageModel],
  );

  const handleExport = useCallback(
    async (project: SlideshowProject, options: SlideshowPublishOptions) => {
      if (onExportProject) {
        await onExportProject(project, options);
      } else if (options.destination === "download") {
        const receipt = await downloadSlideshowExport(
          project,
          apiBaseUrl,
          options.format,
          options.caption,
        );
        if (receipt) {
          const withReceipt = (candidate: SlideshowProject) =>
            candidate.id === project.id
              ? {
                  ...candidate,
                  successfulExportCount: receipt.successfulExportCount,
                  lastExportedAt: receipt.exportedAt,
                  exportHistory: [
                    ...(candidate.exportHistory ?? []),
                    receipt.exportedAt,
                  ].slice(-500),
                }
              : candidate;
          setProjects((current) => current.map(withReceipt));
          setActiveProject((current) =>
            current ? withReceipt(current) : current,
          );
        }
      } else {
        throw new Error(
          "TikTok dispatch is not connected. Download the slideshow or connect an approved posting account.",
        );
      }
      showToast(
        options.destination === "download"
          ? "Slideshow export started."
          : "Slideshow sent to the publishing queue.",
      );
    },
    [apiBaseUrl, onExportProject, showToast],
  );

  return (
    <div className={cn("min-h-[calc(100vh-105px)]", className)}>
      <WorkspaceHeaderAccessory>
        <button
          type="button"
          onClick={() => setTemplateOpen(true)}
          className="pf-button-primary"
        >
          <Plus className="size-3.5" /> New Slideshow
        </button>
      </WorkspaceHeaderAccessory>

      {activeProject ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--pf-canvas)] pt-[calc(58px+env(safe-area-inset-top))] md:pt-[env(safe-area-inset-top)]">
          <SlideshowEditor
            key={editorSession}
            project={activeProject}
            collections={collections}
            onBack={() => {
              setActiveProject(null);
              setSection("drafts");
            }}
            onProjectChange={handleProjectChange}
            onSaveProject={handleSaveProject}
            onRegenerateSlide={handleRegenerateSlide}
            onRegenerateImage={handleRegenerateImage}
            onPublish={setPublishProject}
            imageModels={imageModels}
            selectedImageModel={selectedImageModel}
            onSelectImageModel={setSelectedImageModel}
          />
        </div>
      ) : (
        <>
          <StudioSectionNav section={section} onChange={setSection} draftsCount={projects.length} />
          <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8">
            {section === "create" ? (
              <CreateView
                templates={templates}
                generating={generatingStory}
                onGenerateStory={handleGenerateStory}
                onCustom={startCustom}
                onUseTemplate={startTemplate}
                onBrowseTemplates={() => setTemplateOpen(true)}
                imageModels={imageModels}
                selectedImageModel={selectedImageModel}
                onSelectImageModel={setSelectedImageModel}
                creatorGenerating={generatingCreator}
                onGenerateCreator={handleGenerateCreator}
              />
            ) : null}
            {section === "drafts" ? (
              <DraftsView
                projects={projects}
                loading={loadingProjects}
                error={projectsError}
                onOpen={openEditor}
                onCreate={() => setTemplateOpen(true)}
              />
            ) : null}
          </div>
        </>
      )}

      <TemplateDialog
        open={templateOpen}
        templates={templates}
        onOpenChange={setTemplateOpen}
        onCustom={startCustom}
        onUseTemplate={startTemplate}
      />
      <PublishDialog
        open={Boolean(publishProject)}
        project={publishProject}
        tiktokConnected={tiktokConnected}
        supportsMp4Export={supportsMp4Export}
        onOpenChange={(open) => {
          if (!open) setPublishProject(null);
        }}
        onExport={handleExport}
      />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-[6px] border border-border bg-white px-4 py-3 text-[13px] font-semibold text-foreground shadow-[0_16px_40px_rgba(35,35,35,0.18)]"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-green/10 text-accent-green">
            <Check className="size-3.5" />
          </span>
          {toast}
        </div>
      ) : null}

      {loadingProjects && section === "create" && !activeProject ? (
        <span className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-[12px] text-muted-foreground shadow-lg">
          <LoaderCircle className="size-3 animate-spin" /> Loading drafts
        </span>
      ) : null}

      {creatorProgress ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[var(--pf-canvas)] px-6"
        >
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <span className="mb-6 grid size-14 place-items-center rounded-full bg-[var(--pf-active)] text-white">
              <LoaderCircle className="size-6 animate-spin" />
            </span>
            <p className="text-[15px] font-bold text-foreground">Generating your slide visuals</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {creatorProgress.title}
            </p>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[var(--pf-active)] transition-all duration-500"
                style={{
                  width: `${(creatorProgress.completed / creatorProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="mt-3 font-mono text-[12px] tabular-nums text-muted-foreground">
              {creatorProgress.completed}/{creatorProgress.total} visuals ready
            </p>
            <p className="mt-6 text-[12px] leading-5 text-muted-foreground">
              Keep this tab open. We open your slideshow the moment the images are ready.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
