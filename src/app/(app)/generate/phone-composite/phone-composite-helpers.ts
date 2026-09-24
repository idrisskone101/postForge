import { getPhoneScene } from "@/lib/phone-composite/scenes";
import type { PhoneCompositeFormState } from "./types";

export function initialPhoneCompositeState(): PhoneCompositeFormState {
  return {
    scene: "bathroom",
    usePlaceholder: true,
    baseFile: null,
    screenshotFile: null,
    busy: false,
    error: null,
  };
}

export function phoneCompositeFileLabel(file: File | null, empty: string) {
  return file ? file.name : empty;
}

export function canSubmitPhoneComposite(state: PhoneCompositeFormState) {
  if (state.busy) return false;
  if (!state.screenshotFile) return false;
  return state.usePlaceholder || Boolean(state.baseFile);
}

export function scenePromptFor(sceneId: PhoneCompositeFormState["scene"]) {
  return getPhoneScene(sceneId).prompt;
}

export function fillPromptTitle(sceneId: PhoneCompositeFormState["scene"]) {
  switch (sceneId) {
    case "bathroom":
      return "Fill bathroom blank-screen prompt";
    case "nightstand":
      return "Fill nightstand blank-screen prompt";
    case "gym":
      return "Fill gym blank-screen prompt";
    default: {
      const exhaustive: never = sceneId;
      return exhaustive;
    }
  }
}
