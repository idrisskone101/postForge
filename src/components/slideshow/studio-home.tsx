"use client";

import { CreateView } from "./create-view";
import { DraftsView } from "./drafts-view";
import { StudioSectionNav } from "./studio-section-nav";
import type {
  SlideshowCreatorGenerateInput,
  SlideshowProjectListItem,
  SlideshowSection,
  SlideshowStoryGenerateInput,
  SlideshowTemplate,
} from "./types";

export function StudioHome({
  section,
  onSectionChange,
  draftsCount,
  templates,
  generatingStory,
  onGenerateStory,
  onCustom,
  onUseTemplate,
  onBrowseTemplates,
  imageModels,
  selectedImageModel,
  onSelectImageModel,
  creatorGenerating,
  onGenerateCreator,
  projects,
  loadingProjects,
  projectsError,
  onOpenDraft,
  onCreate,
}: {
  section: SlideshowSection;
  onSectionChange: (section: SlideshowSection) => void;
  draftsCount: number;
  templates: SlideshowTemplate[];
  generatingStory: boolean;
  onGenerateStory: (input: SlideshowStoryGenerateInput) => Promise<void>;
  onCustom: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
  onBrowseTemplates: () => void;
  imageModels: Array<{ id: string; name: string }>;
  selectedImageModel: string | null;
  onSelectImageModel: (id: string) => void;
  creatorGenerating: boolean;
  onGenerateCreator: (input: SlideshowCreatorGenerateInput) => Promise<void>;
  projects: SlideshowProjectListItem[];
  loadingProjects: boolean;
  projectsError: string | null;
  onOpenDraft: (project: SlideshowProjectListItem) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <StudioSectionNav
        section={section}
        onChange={onSectionChange}
        draftsCount={draftsCount}
      />
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8">
        {section === "create" ? (
          <CreateView
            templates={templates}
            generating={generatingStory}
            onGenerateStory={onGenerateStory}
            onCustom={onCustom}
            onUseTemplate={onUseTemplate}
            onBrowseTemplates={onBrowseTemplates}
            imageModels={imageModels}
            selectedImageModel={selectedImageModel}
            onSelectImageModel={onSelectImageModel}
            creatorGenerating={creatorGenerating}
            onGenerateCreator={onGenerateCreator}
          />
        ) : null}
        {section === "drafts" ? (
          <DraftsView
            projects={projects}
            loading={loadingProjects}
            error={projectsError}
            onOpen={onOpenDraft}
            onCreate={onCreate}
          />
        ) : null}
      </div>
    </>
  );
}
