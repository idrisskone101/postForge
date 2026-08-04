"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { cn } from "@/lib/utils";

import {
  createSlideshowAutomation,
  createSlideshowCollection,
  deleteSlideshowAutomation,
  deleteSlideshowCollection,
  deriveSlideshowAnalytics,
  downloadSlideshowExport,
  fetchSlideshowAutomations,
  fetchSlideshowCollections,
  fetchSlideshowProjects,
  persistSlideshowProject,
  requestSlideshowCopyVariation,
  requestSlideshowImageGeneration,
  requestSlideshowStory,
  renameSlideshowCollection,
  uploadSlideshowCollection,
  updateSlideshowAutomation,
  updateSlideshowAutomationStatus,
} from "./api";
import {
  createBlankSlideshowProject,
  createProjectFromTemplate,
  DEFAULT_SLIDESHOW_AUTOMATIONS,
  DEFAULT_SLIDESHOW_INSPIRATION,
  DEFAULT_SLIDESHOW_TEMPLATES,
} from "./fixtures";
import { ImageCollectionDialog } from "./image-collection-dialog";
import { PublishDialog } from "./publish-dialog";
import { SlideshowEditor } from "./slideshow-editor";
import {
  AnalyticsView,
  AutomationDialog,
  AutomationsView,
  CreateView,
  DraftsView,
  ImagesView,
  InspirationView,
  StoryGeneratorDialog,
  StudioSectionNav,
  TemplateDialog,
} from "./studio-views";
import type {
  SlideshowAutomation,
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
  initialAutomations,
  initialCollections,
  initialInspiration = DEFAULT_SLIDESHOW_INSPIRATION,
  initialAnalytics = null,
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
  const [automations, setAutomations] = useState(
    initialAutomations ?? DEFAULT_SLIDESHOW_AUTOMATIONS,
  );
  const [collections, setCollections] = useState(
    initialCollections ?? [],
  );
  const [activeProject, setActiveProject] = useState(initialProject);
  const [editorSession, setEditorSession] = useState(0);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [storyGeneratorOpen, setStoryGeneratorOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] =
    useState<SlideshowAutomation | null>(null);
  const [imageCollectionOpen, setImageCollectionOpen] = useState(false);
  const [publishProject, setPublishProject] = useState<SlideshowProject | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(
    initialProjects === undefined,
  );
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [uploadingCollection, setUploadingCollection] = useState(false);
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
    if (initialAutomations !== undefined) return;
    let active = true;
    void fetchSlideshowAutomations(apiBaseUrl)
      .then((loaded) => {
        if (active) setAutomations(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [apiBaseUrl, initialAutomations]);

  useEffect(() => {
    if (initialCollections !== undefined) return;
    let active = true;
    void fetchSlideshowCollections(apiBaseUrl)
      .then((loaded) => {
        if (active) setCollections(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [apiBaseUrl, initialCollections]);

  useEffect(() => {
    if (
      initialProjects !== undefined ||
      (section !== "drafts" && section !== "analytics") ||
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

  useEffect(() => {
    if (
      initialAutomations !== undefined ||
      (section !== "automations" && section !== "analytics") ||
      activeProject
    ) {
      return;
    }
    let active = true;
    void fetchSlideshowAutomations(apiBaseUrl)
      .then((loaded) => {
        if (active) setAutomations(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activeProject, apiBaseUrl, initialAutomations, section]);

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

  const handleCreateCollection = useCallback(
    async (collection: SlideshowCollection) => {
      const saved = await createSlideshowCollection(collection, apiBaseUrl);
      setCollections((current) => [saved, ...current]);
      showToast("Image collection created.");
    },
    [apiBaseUrl, showToast],
  );

  const handleRenameCollection = useCallback(
    async (collection: SlideshowCollection, name: string) => {
      const saved = await renameSlideshowCollection(
        collection,
        name,
        apiBaseUrl,
      );
      setCollections((current) =>
        current.map((item) => (item.id === collection.id ? saved : item)),
      );
      showToast("Image collection renamed.");
    },
    [apiBaseUrl, showToast],
  );

  const handleDeleteCollection = useCallback(
    async (collection: SlideshowCollection) => {
      await deleteSlideshowCollection(collection, apiBaseUrl);
      setCollections((current) =>
        current.filter((item) => item.id !== collection.id),
      );
      showToast("Image collection deleted.");
    },
    [apiBaseUrl, showToast],
  );

  const handleUpload = useCallback(
    (files: FileList) => {
      setUploadingCollection(true);
      void uploadSlideshowCollection(files, apiBaseUrl)
        .then((collection) => {
          setCollections((current) => [collection, ...current]);
          showToast("Uploaded images saved as a collection.");
        })
        .catch((error) =>
          showToast(
            error instanceof Error ? error.message : "Could not upload these images.",
          ),
        )
        .finally(() => setUploadingCollection(false));
    },
    [apiBaseUrl, showToast],
  );

  const handleCreateAutomation = useCallback(
    async (automation: SlideshowAutomation) => {
      const saved = await createSlideshowAutomation(automation, apiBaseUrl);
      setAutomations((current) => [saved, ...current]);
      showToast("Automation created. New runs will stay in Drafts for review.");
    },
    [apiBaseUrl, showToast],
  );

  const handleUpdateAutomation = useCallback(
    async (automation: SlideshowAutomation) => {
      const saved = await updateSlideshowAutomation(automation, apiBaseUrl);
      setAutomations((current) =>
        current.map((item) => (item.id === automation.id ? saved : item)),
      );
      setEditingAutomation(null);
      showToast("Automation updated.");
    },
    [apiBaseUrl, showToast],
  );

  const handleDeleteAutomation = useCallback(
    async (automation: SlideshowAutomation) => {
      await deleteSlideshowAutomation(automation, apiBaseUrl);
      setAutomations((current) =>
        current.filter((item) => item.id !== automation.id),
      );
      if (editingAutomation?.id === automation.id) {
        setEditingAutomation(null);
        setAutomationOpen(false);
      }
      showToast("Automation deleted.");
    },
    [apiBaseUrl, editingAutomation?.id, showToast],
  );

  const handleToggleAutomation = useCallback(
    (automation: SlideshowAutomation) => {
      const status = automation.status === "active" ? "paused" : "active";
      setAutomations((current) =>
        current.map((item) =>
          item.id === automation.id ? { ...item, status } : item,
        ),
      );
      void updateSlideshowAutomationStatus(automation, status, apiBaseUrl)
        .then((saved) => {
          setAutomations((current) =>
            current.map((item) => (item.id === automation.id ? saved : item)),
          );
        })
        .catch((error) => {
          setAutomations((current) =>
            current.map((item) =>
              item.id === automation.id ? automation : item,
            ),
          );
          showToast(error instanceof Error ? error.message : "Could not update automation.");
        });
    },
    [apiBaseUrl, showToast],
  );

  const analytics = useMemo(
    () => initialAnalytics ?? deriveSlideshowAnalytics(projects, automations),
    [automations, initialAnalytics, projects],
  );

  return (
    <div className={cn("min-h-[calc(100vh-105px)] bg-background", className)}>
      <WorkspaceHeaderAccessory>
        <Button
          onClick={() => setTemplateOpen(true)}
          className="bg-accent-coral text-white hover:bg-[#ff6540]"
        >
          <Plus /> New slideshow
        </Button>
      </WorkspaceHeaderAccessory>

      {activeProject ? (
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
          onOpenImages={() => setImageCollectionOpen(true)}
          onPublish={setPublishProject}
        />
      ) : (
        <>
          <StudioSectionNav section={section} onChange={setSection} />
          <main>
            {section === "create" ? (
              <CreateView
                templates={templates}
                onCustom={startCustom}
                onGenerate={() => setStoryGeneratorOpen(true)}
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
            {section === "automations" ? (
              <AutomationsView
                automations={automations}
                onNew={() => {
                  setEditingAutomation(null);
                  setAutomationOpen(true);
                }}
                onToggle={handleToggleAutomation}
                onEdit={(automation) => {
                  setEditingAutomation(automation);
                  setAutomationOpen(true);
                }}
                onDelete={handleDeleteAutomation}
              />
            ) : null}
            {section === "images" ? (
              <ImagesView
                collections={collections}
                onPinterest={() => setImageCollectionOpen(true)}
                onUpload={handleUpload}
                onRename={handleRenameCollection}
                onDelete={handleDeleteCollection}
                uploading={uploadingCollection}
              />
            ) : null}
            {section === "inspiration" ? (
              <InspirationView
                inspiration={initialInspiration}
                templates={templates}
                onUse={startTemplate}
              />
            ) : null}
            {section === "analytics" ? (
              <AnalyticsView
                analytics={analytics}
                tiktokConnected={tiktokConnected}
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
      <StoryGeneratorDialog
        open={storyGeneratorOpen}
        onOpenChange={setStoryGeneratorOpen}
        onGenerate={async (input) => {
          const project = await requestSlideshowStory(input, apiBaseUrl);
          openEditor(project);
          showToast(
            project.generationWarning
              ? `Local story fallback used: ${project.generationWarning}`
              : "Slideshow generated with Gemini.",
          );
        }}
      />
      <AutomationDialog
        open={automationOpen}
        projects={projects}
        collections={collections}
        automation={editingAutomation}
        onOpenChange={(nextOpen) => {
          setAutomationOpen(nextOpen);
          if (!nextOpen) setEditingAutomation(null);
        }}
        onSave={
          editingAutomation
            ? handleUpdateAutomation
            : handleCreateAutomation
        }
      />
      <ImageCollectionDialog
        open={imageCollectionOpen}
        onOpenChange={setImageCollectionOpen}
        onCreate={handleCreateCollection}
        apiBaseUrl={apiBaseUrl}
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
          className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs font-medium shadow-2xl"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
            <Check className="size-4" />
          </span>
          {toast}
        </div>
      ) : null}

      {loadingProjects && section === "create" && !activeProject ? (
        <span className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground shadow-lg">
          <LoaderCircle className="size-3 animate-spin" /> Loading drafts
        </span>
      ) : null}
    </div>
  );
}
