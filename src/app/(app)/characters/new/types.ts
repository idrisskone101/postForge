import type { RefObject } from "react";
import type {
  CharacterAttributeSection,
  CharacterAttributes,
} from "@/lib/character-attributes";

export type CharacterBuilderHeaderViewModel = {
  editId: string | null;
  name: string;
  nameInvalid: boolean;
  saving: boolean;
  rendering: boolean;
  missingEditRecord: boolean;
  previewSaveBlocked: boolean;
  readyPreviewFingerprint: string | null;
  onNameChange: (name: string) => void;
  randomizeAndRender: () => void;
  saveCharacter: () => void;
  saveAction: { label: string; title: string | undefined };
};

export type CharacterPreviewStageViewModel = {
  name: string;
  avatarId: string | null;
  previewFileId: string | null;
  previewIsPhotographic: boolean;
  rendering: boolean;
  saving: boolean;
  previewRequiresRender: boolean;
  previewSaveBlocked: boolean;
  rerender: () => void;
  onLoadError: () => void;
};

export type CharacterAttributeEditorViewModel = {
  attributes: CharacterAttributes;
  activeSection: string;
  active: CharacterAttributeSection | undefined;
  error: string | null;
  /** The edit link points at no saved character. The notice names that and cannot be dismissed. */
  errorIsMissingRecord?: boolean;
  onDismissError: () => void;
  onSelectSection: (sectionId: string) => void;
  copyPrompt: () => void;
  /** Empties the current section's attributes. Local until Save; the toast offers Undo. */
  clearSection: () => void;
  /** Undo sends focus back here: the toast that held it is leaving. */
  clearButtonRef: RefObject<HTMLButtonElement | null>;
  sectionIsEmpty: boolean;
  onImport: () => void;
  copyAttributes: () => void;
  selectAttribute: (key: string, value: string) => void;
};
