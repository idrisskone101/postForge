import type { PhoneSceneId } from "@/lib/phone-composite/types";

export type PhoneCompositeFormState = {
  scene: PhoneSceneId;
  usePlaceholder: boolean;
  baseFile: File | null;
  screenshotFile: File | null;
  busy: boolean;
  error: string | null;
};

export type PhoneCompositeSectionProps = {
  onUseScenePrompt: (prompt: string) => void;
};

export type PhoneCompositeViewModel = {
  scene: PhoneSceneId;
  usePlaceholder: boolean;
  baseLabel: string;
  screenshotLabel: string;
  busy: boolean;
  error: string | null;
  canSubmit: boolean;
  fillPromptTitle: string;
};
