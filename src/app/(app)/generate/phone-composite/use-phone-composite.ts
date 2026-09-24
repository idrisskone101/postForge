"use client";

import { useState } from "react";
import { userErrorMessage } from "@/lib/user-error-message";
import { getPhoneScene } from "@/lib/phone-composite/scenes";
import {
  canSubmitPhoneComposite,
  fillPromptTitle,
  initialPhoneCompositeState,
  phoneCompositeFileLabel,
  scenePromptFor,
} from "./phone-composite-helpers";
import type { PhoneCompositeFormState } from "./types";

export function usePhoneComposite() {
  const [state, setState] = useState(initialPhoneCompositeState);

  const patch = (next: Partial<PhoneCompositeFormState>) => {
    setState((current) => ({ ...current, ...next, error: next.error ?? null }));
  };

  const submit = async (): Promise<string | null> => {
    if (!canSubmitPhoneComposite(state) || !state.screenshotFile) return null;
    setState((current) => ({ ...current, busy: true, error: null }));
    try {
      const body = new FormData();
      body.set("scene", state.scene);
      body.set("usePlaceholder", state.usePlaceholder ? "true" : "false");
      body.set("screenshot", state.screenshotFile);
      if (state.baseFile) body.set("base", state.baseFile);
      const response = await fetch("/api/generate/phone-composite", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "Phone screenshot composite failed.");
      }
      window.location.assign(`/generate/${payload.id}`);
      return payload.id;
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        error: userErrorMessage(error, "Phone screenshot composite failed."),
      }));
      return null;
    }
  };

  return {
    view: {
      scene: state.scene,
      sceneDetail: getPhoneScene(state.scene).detail,
      usePlaceholder: state.usePlaceholder,
      baseLabel: phoneCompositeFileLabel(
        state.baseFile,
        "Optional lifestyle photo with a blank matte-black screen",
      ),
      screenshotLabel: phoneCompositeFileLabel(
        state.screenshotFile,
        "PNG of the real app UI — HairTrace Today or equivalent",
      ),
      busy: state.busy,
      error: state.error,
      canSubmit: canSubmitPhoneComposite(state),
      fillPromptTitle: fillPromptTitle(state.scene),
    },
    actions: {
      onSceneChange: (scene: PhoneCompositeFormState["scene"]) => patch({ scene }),
      onUsePlaceholderChange: (usePlaceholder: boolean) => patch({ usePlaceholder }),
      onBaseFileChange: (baseFile: File | null) =>
        patch({ baseFile, usePlaceholder: baseFile ? false : state.usePlaceholder }),
      onScreenshotFileChange: (screenshotFile: File | null) => patch({ screenshotFile }),
      onFillPrompt: () => scenePromptFor(state.scene),
      onSubmit: () => void submit(),
    },
  };
}
