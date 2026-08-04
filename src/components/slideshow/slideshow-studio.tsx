"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";

import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { cn } from "@/lib/utils";
import { fetchPlatformCollections } from "@/lib/collections-client";

import {
  downloadSlideshowExport,
  fetchSlideshowProjects,
  persistSlideshowProject,
  requestSlideshowCopyVariation,
  requestSlideshowImageGeneration,
  requestSlideshowStory,
} from "./api";
import {
  createBlankSlideshowProject,
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
    }) => {
      setGeneratingStory(true);
      try {
        const project = await requestSlideshowStory(input, apiBaseUrl);
        openEditor(project);
        showToast(
          project.generationWarning
            ? `Local story fallback used: ${project.generationWarning}`
            : "Slideshow generated with Gemini.",
        );
      } finally {
        setGeneratingStory(false);
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
      );
    },
    [apiBaseUrl, onRegenerateImage],
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
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#F3F4EF] pt-[calc(58px+env(safe-area-inset-top))] md:pt-[env(safe-area-inset-top)]">
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
          />
        </div>
      ) : (
        <>
          <StudioSectionNav section={section} onChange={setSection} draftsCount={projects.length} />
          <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8">
            {section === "create" ? (
              <CreateView
                templates={templates}
                generating={generatingStory}
                onGenerateStory={handleGenerateStory}
                onCustom={startCustom}
                onUseTemplate={startTemplate}
                onBrowseTemplates={() => setTemplateOpen(true)}
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
          </main>
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
          className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-[11px] border border-[#DADBD2] bg-white px-4 py-3 text-[11px] font-semibold text-[#30312E] shadow-[0_16px_40px_rgba(35,35,35,0.18)]"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-green/10 text-accent-green">
            <Check className="size-3.5" />
          </span>
          {toast}
        </div>
      ) : null}

      {loadingProjects && section === "create" && !activeProject ? (
        <span className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border border-[#DADBD2] bg-white px-3 py-2 text-[10px] text-[#777873] shadow-lg">
          <LoaderCircle className="size-3 animate-spin" /> Loading drafts
        </span>
      ) : null}
    </div>
  );
}
