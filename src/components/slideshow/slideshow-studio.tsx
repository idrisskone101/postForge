"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { cn } from "@/lib/utils";
import { fetchPlatformCollections } from "@/lib/collections-client";
import { fetchModelsCatalog } from "@/lib/ai/models-client";

import {
  fetchSlideshowProject,
} from "@/lib/slideshow/client";
import { slideshowProjectListItemFromDetail, upsertById } from "@/lib/slideshow/list-client";
import {
  createBlankSlideshowProject,
  createProjectFromTemplate,
  DEFAULT_SLIDESHOW_TEMPLATES,
} from "./fixtures";
import { PublishDialog } from "./publish-dialog";
import { SlideshowEditor } from "./slideshow-editor";
import {
  generateStudioCreatorProject,
  type StudioCreatorProgress,
} from "./studio-creator-generate";
import {
  saveStudioProject,
  mergeSavedStudioProject,
  regenerateStudioSlide,
  regenerateStudioSlideImage,
} from "./studio-editor-actions";
import {
  applyStudioExportReceipt,
  applyStudioExportReceiptToProject,
  exportStudioSlideshow,
} from "./studio-export";
import {
  watchStudioDrafts,
  watchStudioDraftsRefresh,
} from "./studio-drafts-load";
import { generateStudioStory } from "./studio-story";
import { StudioHome } from "./studio-home";
import {
  StudioCreatorProgressOverlay,
  StudioDraftsLoading,
  StudioToast,
} from "./studio-overlays";
import { TemplateDialog } from "./template-dialog";
import {
  isLocalSlideshowId,
  type SlideshowCollection,
  type SlideshowCreatorGenerateInput,
  type SlideshowImageGenerationResult,
  type SlideshowProject,
  type SlideshowProjectListItem,
  type SlideshowPublishOptions,
  type SlideshowSlide,
  type SlideshowStoryGenerateInput,
  type SlideshowStudioProps,
  type SlideshowTemplate,
} from "./types";

export function SlideshowStudio(props: SlideshowStudioProps) {
  const {
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
    initialViewMode = "edit",
  } = props;
  const [section, setSection] = useState(initialSection);
  const [projects, setProjects] = useState<SlideshowProjectListItem[]>(initialProjects ?? []);
  const drafts = useRef(new Map<string, SlideshowProject>());
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
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(null);

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
    return watchStudioDrafts({
      apiBaseUrl,
      enabled: initialProjects === undefined,
      onLoaded: setProjects,
      onError: setProjectsError,
      onFinally: () => setLoadingProjects(false),
    });
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
    return watchStudioDraftsRefresh({
      apiBaseUrl,
      enabled:
        initialProjects === undefined && section === "drafts" && !activeProject,
      onLoaded: (loaded) => {
        setProjects(loaded);
        setProjectsError(null);
      },
      onError: setProjectsError,
    });
  }, [activeProject, apiBaseUrl, initialProjects, section]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const upsertDraft = useCallback((project: SlideshowProject) => {
    drafts.current.set(project.id, project);
    if (project.clientId) drafts.current.set(project.clientId, project);
    setProjects((current) => upsertById(current, slideshowProjectListItemFromDetail(project)));
  }, []);

  const openEditor = useCallback((project: SlideshowProject) => {
    upsertDraft(project);
    setActiveProject(project);
    setEditorSession((current) => current + 1);
  }, [upsertDraft]);

  const openDraft = useCallback(async (item: SlideshowProjectListItem) => {
    const local = drafts.current.get(item.id);
    if (local && isLocalSlideshowId(item.id)) {
      openEditor(local);
      return;
    }
    try {
      openEditor(await fetchSlideshowProject(item.id, apiBaseUrl));
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Could not open slideshow draft.");
    }
  }, [apiBaseUrl, openEditor]);

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
    async (input: SlideshowStoryGenerateInput) => {
      setGeneratingStory(true);
      try {
        const { project, toast } = await generateStudioStory(input, apiBaseUrl);
        openEditor(project);
        showToast(toast);
      } finally {
        setGeneratingStory(false);
      }
    },
    [apiBaseUrl, openEditor, showToast],
  );

  const [generatingCreator, setGeneratingCreator] = useState(false);
  const [creatorProgress, setCreatorProgress] =
    useState<StudioCreatorProgress | null>(null);

  const handleGenerateCreator = useCallback(
    async (input: SlideshowCreatorGenerateInput) => {
      setGeneratingCreator(true);
      try {
        await generateStudioCreatorProject(input, {
          apiBaseUrl,
          openEditor,
          showToast,
          upsertDraft,
          setCreatorProgress,
        });
      } finally {
        setGeneratingCreator(false);
        setCreatorProgress(null);
      }
    },
    [apiBaseUrl, openEditor, showToast, upsertDraft],
  );

  const handleProjectChange = useCallback((project: SlideshowProject) => {
    setActiveProject(project);
    upsertDraft(project);
  }, [upsertDraft]);

  const handleSaveProject = useCallback(
    async (project: SlideshowProject) => {
      const resolved = await saveStudioProject({
        project,
        apiBaseUrl,
        onSaveProject,
      });
      setProjects((current) =>
        mergeSavedStudioProject(current, project.id, resolved),
      );
      drafts.current.set(resolved.id, resolved);
      if (resolved.clientId) drafts.current.set(resolved.clientId, resolved);
      setActiveProject(resolved);
      return resolved;
    },
    [apiBaseUrl, onSaveProject],
  );

  const handleRegenerateSlide = useCallback(
    async (project: SlideshowProject, slide: SlideshowSlide) => {
      return regenerateStudioSlide(
        project,
        slide,
        apiBaseUrl,
        onRegenerateSlide,
      );
    },
    [apiBaseUrl, onRegenerateSlide],
  );

  const handleRegenerateImage = useCallback(
    async (
      project: SlideshowProject,
      slide: SlideshowSlide,
      onQueuedRevision: (revision: number) => void,
    ): Promise<SlideshowImageGenerationResult | void> => {
      return regenerateStudioSlideImage(
        project,
        slide,
        apiBaseUrl,
        onQueuedRevision,
        selectedImageModel,
        onRegenerateImage,
      );
    },
    [apiBaseUrl, onRegenerateImage, selectedImageModel],
  );

  const handleExport = useCallback(
    async (project: SlideshowProject, options: SlideshowPublishOptions) => {
      await exportStudioSlideshow({
        project,
        options,
        apiBaseUrl,
        onExportProject,
        applyExportReceipt: (projectId, receipt) => {
          setProjects((current) =>
            applyStudioExportReceipt(current, projectId, receipt),
          );
          setActiveProject((current) =>
            applyStudioExportReceiptToProject(current, projectId, receipt),
          );
        },
        showToast,
      });
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
        <div className="fixed inset-0 z-40 overflow-hidden bg-[var(--pf-canvas)] pt-[calc(58px+env(safe-area-inset-top))] md:pt-[env(safe-area-inset-top)]">
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
            initialViewMode={initialViewMode}
          />
        </div>
      ) : (
          <StudioHome
            home={{
              section,
              onSectionChange: setSection,
              draftsCount: projects.length,
              templates,
              generatingStory,
              onGenerateStory: handleGenerateStory,
              onCustom: startCustom,
              onUseTemplate: startTemplate,
              onBrowseTemplates: () => setTemplateOpen(true),
              imageModels,
              selectedImageModel,
              onSelectImageModel: setSelectedImageModel,
              creatorGenerating: generatingCreator,
              onGenerateCreator: handleGenerateCreator,
              projects,
              loadingProjects,
              projectsError,
              onOpenDraft: openDraft,
              onCreate: () => setTemplateOpen(true),
            }}
          />
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

      {toast ? <StudioToast message={toast} /> : null}
      {loadingProjects && section === "create" && !activeProject ? (
        <StudioDraftsLoading />
      ) : null}
      {creatorProgress ? (
        <StudioCreatorProgressOverlay progress={creatorProgress} />
      ) : null}
    </div>
  );
}
