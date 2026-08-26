import type {
  CharacterAttributeSection,
  CharacterAttributes,
} from "@/lib/character-attributes";

export type CharacterBuilderHeaderViewModel = {
  editId: string | null;
  name: string;
  saving: boolean;
  rendering: boolean;
  missingEditRecord: boolean;
  previewSaveBlocked: boolean;
  readyPreviewFingerprint: string | null;
  onNameChange: (name: string) => void;
  randomizeAndRender: () => void;
  onImport: () => void;
  copyAttributes: () => void;
  saveCharacter: () => void;
  saveAction: { label: string; title: string | undefined };
};

export type CharacterPreviewStageViewModel = {
  name: string;
  attributes: CharacterAttributes;
  avatarId: string | null;
  previewFileId: string | null;
  previewIsPhotographic: boolean;
  rendering: boolean;
  saving: boolean;
  previewRequiresRender: boolean;
  previewSaveBlocked: boolean;
  rerender: () => void;
  randomizeAndRender: () => void;
  onLoadError: () => void;
};

export type CharacterAttributeEditorViewModel = {
  attributes: CharacterAttributes;
  activeSection: string;
  active: CharacterAttributeSection | undefined;
  error: string | null;
  onDismissError: () => void;
  onSelectSection: (sectionId: string) => void;
  copyPrompt: () => void;
  selectAttribute: (key: string, value: string) => void;
};
