import type { Dispatch, RefObject, SetStateAction } from "react";

import type { EditorSaveState } from "./editor-controls";
import type { SlideshowViewMode } from "./slideshow-view";
import type {
  CreatorImagePickerTarget,
  SlideshowCollection,
  SlideshowCreatorGenerateInput,
  SlideshowProject,
  SlideshowProjectListItem,
  SlideshowPublishOptions,
  SlideshowSection,
  SlideshowSlide,
  SlideshowSlideKind,
  SlideshowStoryGenerateInput,
  SlideshowTemplate,
  SlideshowTextSettings,
} from "./types";

export type SlideshowEditorWorkspace = {
  draft: SlideshowProject;
  saveState: EditorSaveState;
  saveError: string | null;
  viewMode: SlideshowViewMode;
  selectedSlideId: string;
  activeSlide: SlideshowSlide;
  activePhase: SlideshowSlideKind;
  activeIndex: number;
  layerCount: number;
  collections: SlideshowCollection[];
  phaseSettings: SlideshowProject["phaseSettings"][SlideshowSlideKind];
  advanced: boolean;
  imageModels: Array<{ id: string; name: string }>;
  selectedImageModel: string | null;
  regenerating: boolean;
  regeneratingImage: boolean;
  previewIndices: number[];
  activeThumbRef: RefObject<HTMLButtonElement | null>;
  pickerOpen: boolean;
  pickerAssetIds: string[];
  updateProject: (update: (current: SlideshowProject) => SlideshowProject) => void;
  updatePhaseSettings: (
    patch: Partial<SlideshowProject["phaseSettings"][SlideshowSlideKind]>,
  ) => void;
  updateTextSettings: (patch: Partial<SlideshowTextSettings>) => void;
  updateActiveSlide: (patch: Partial<SlideshowSlide>) => void;
  changeViewMode: (mode: SlideshowViewMode) => void;
  selectSlide: (slide: SlideshowSlide) => void;
  selectPhase: (phase: SlideshowSlideKind) => void;
  applyCollection: (collectionId: string) => void;
  applyPickedAssets: () => void;
  addSlide: () => void;
  duplicateSlide: () => void;
  deleteSlide: () => void;
  moveSlide: (direction: -1 | 1) => void;
  setPickerOpen: Dispatch<SetStateAction<boolean>>;
  setPickerAssetIds: Dispatch<SetStateAction<string[]>>;
  setAdvanced: Dispatch<SetStateAction<boolean>>;
  onSelectImageModel?: (modelId: string) => void;
  onBack: () => void;
  onPublish: () => void;
  onRegenerateText: () => void;
  onRegenerateImage: () => void;
};

export type CreatorDraft = {
  title: string;
  onTitleChange: (value: string) => void;
  hook: string;
  onHookChange: (value: string) => void;
  hookImageAssetId: string | null;
  onClearHookImage: () => void;
  slideLines: string[];
  slideImageAssetIds: Array<string | null>;
  onUpdateLine: (index: number, value: string) => void;
  onAddSlideLine: () => void;
  onRemoveSlideLine: (index: number) => void;
  onClearSlideImage: (index: number) => void;
  onOpenImagePicker: (target: CreatorImagePickerTarget) => void;
  aspectRatio: "9:16" | "4:5" | "1:1" | "16:9";
  onAspectRatioChange: (value: "9:16" | "4:5" | "1:1" | "16:9") => void;
  imageModels?: Array<{ id: string; name: string }>;
  selectedImageModel?: string | null;
  onSelectImageModel?: (id: string) => void;
  needsGeneration: boolean;
  generating: boolean;
  error: string | null;
  onSubmit: () => void;
  onOpenPinterest: () => void;
  referenceAssetIds: string[];
  onReferenceAssetIdsChange: (ids: string[]) => void;
  referenceRefreshKey: number;
  preferredReferenceAssetIds: string[];
  deriving: boolean;
  onDeriveFromReferences: () => void;
  templateText: string;
  onTemplateTextChange: (value: string) => void;
  copiedJson: boolean;
  onCopyTemplateJson: () => void;
  templateError: string | null;
  target: CreatorImagePickerTarget | null;
  pickerLabel: string;
  pickerAssetIds: string[];
  onPickerAssetIdsChange: (ids: string[]) => void;
  onClosePicker: () => void;
  onApplyPicker: () => void;
};

export type StudioHomeView = {
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
};

export type SlideshowPublishWorkspace = {
  publishingToTikTok: boolean;
  visibility: SlideshowPublishOptions["visibility"];
  onVisibilityChange: (value: SlideshowPublishOptions["visibility"]) => void;
  scheduledFor: string;
  onScheduledForChange: (value: string) => void;
  scheduleEnabled: boolean;
  onScheduleEnabledChange: (value: boolean) => void;
  allowComments: boolean;
  onAllowCommentsChange: (value: boolean) => void;
  allowDuet: boolean;
  onAllowDuetChange: (value: boolean) => void;
  allowStitch: boolean;
  onAllowStitchChange: (value: boolean) => void;
  brandedContent: boolean;
  onBrandedContentChange: (value: boolean) => void;
  aiGenerated: boolean;
  onAiGeneratedChange: (value: boolean) => void;
  project: SlideshowProject;
  tiktokConnected: boolean;
  format: SlideshowPublishOptions["format"];
  destination: SlideshowPublishOptions["destination"];
  formatBlocked: boolean;
  destinationBlocked: boolean;
  canSubmit: boolean;
  exporting: boolean;
  error: string | null;
  exported: boolean;
  onSubmit: () => void;
};

export type SlideshowPublishDialog = {
  open: boolean;
  project: SlideshowProject | null;
  tiktokConnected: boolean;
  supportsMp4Export: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (
    project: SlideshowProject,
    options: SlideshowPublishOptions,
  ) => Promise<void>;
};
