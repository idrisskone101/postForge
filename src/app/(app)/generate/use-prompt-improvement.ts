"use client";

import { useEffect, useRef, useState } from "react";
import {
  createPromptImprovementRequestGate,
  invalidatePromptImprovementUndo,
  restorePromptImprovementUndo,
} from "@/lib/ai/prompt-improvement-ui";
import { apiGet } from "@/lib/api/client";
import { userErrorMessage } from "@/lib/user-error-message";
import { postPromptImprove } from "./generation-requests";
import type { ModelDefinition } from "@/lib/ai/types";

export function usePromptImprovement(context: string) {
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [promptBeforeImprovement, setPromptBeforeImprovement] = useState<string | null>(
    null
  );
  const [promptImprovementError, setPromptImprovementError] = useState<string | null>(
    null
  );
  const [promptImprovementNotice, setPromptImprovementNotice] = useState<string | null>(
    null
  );
  const [promptEnhancerConfigured, setPromptEnhancerConfigured] = useState<
    boolean | null
  >(null);
  const promptImprovementContextRef = useRef(context);
  const promptImprovementRequestGateRef = useRef(
    createPromptImprovementRequestGate()
  );

  useEffect(() => {
    promptImprovementContextRef.current = context;
  }, [context]);

  useEffect(() => {
    let active = true;
    void apiGet<{
      providers: Array<{ provider: string; configured: boolean }>;
    }>("/api/settings/provider-credentials")
      .then((result) => {
        if (!active) return;
        const gemini = result.providers.find((provider) => provider.provider === "gemini");
        setPromptEnhancerConfigured(gemini?.configured ?? false);
      })
      .catch(() => {
        if (active) setPromptEnhancerConfigured(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleImprovePrompt = async ({
    prompt,
    selectedDefinition,
    aspectRatio,
    duration,
    enableAudio,
    hasCharacterReference,
    hasVisualReference,
    onPromptChange,
  }: {
    prompt: string;
    selectedDefinition: ModelDefinition | undefined;
    aspectRatio: string;
    duration: number;
    enableAudio: boolean;
    hasCharacterReference: boolean;
    hasVisualReference: boolean;
    onPromptChange: (prompt: string) => void;
  }) => {
    if (!selectedDefinition) {
      setPromptImprovementError("Choose a model before improving the prompt.");
      return;
    }
    const originalPromptValue = prompt;
    const originalPrompt = originalPromptValue.trim();
    if (!originalPrompt) {
      setPromptImprovementError("Write a rough prompt first. A short sentence is enough.");
      return;
    }

    const requestToken = promptImprovementRequestGateRef.current.begin();
    if (!requestToken) return;
    const requestContext = promptImprovementContextRef.current;
    setIsImprovingPrompt(true);
    setPromptImprovementError(null);
    setPromptImprovementNotice(null);
    try {
      const result = await postPromptImprove({
        prompt: originalPrompt,
        modelId: selectedDefinition.id,
        aspectRatio,
        duration:
          selectedDefinition.type === "video" ? duration : undefined,
        enableAudio:
          selectedDefinition.type === "video" &&
          enableAudio &&
          selectedDefinition.capabilities.nativeAudio === true,
        hasCharacterReference,
        hasVisualReference,
      });
      if (
        !promptImprovementRequestGateRef.current.isCurrent(requestToken) ||
        promptImprovementContextRef.current !== requestContext
      ) {
        setPromptImprovementError(
          "Your prompt or generation settings changed while the improved version was being prepared. Run Improve prompt again when you are ready."
        );
        return;
      }
      setPromptBeforeImprovement(originalPromptValue);
      onPromptChange(result.prompt);
      setPromptImprovementNotice(
        `Prompt improved for ${selectedDefinition.name}. Review it before generating.`
      );
    } catch (error) {
      setPromptImprovementError(
        userErrorMessage(error, "Prompt improvement failed. Your original prompt is unchanged.")
      );
    } finally {
      promptImprovementRequestGateRef.current.finish(requestToken);
      setIsImprovingPrompt(false);
    }
  };

  const handleUndoPromptImprovement = (onPromptChange: (prompt: string) => void) => {
    const restored = restorePromptImprovementUndo({
      promptBeforeImprovement,
      promptImprovementNotice,
    });
    if (!restored) return;
    promptImprovementRequestGateRef.current.invalidateInputs();
    onPromptChange(restored.prompt);
    setPromptBeforeImprovement(restored.state.promptBeforeImprovement);
    setPromptImprovementError(null);
    setPromptImprovementNotice(restored.state.promptImprovementNotice);
  };

  const invalidateUndoOnPromptEdit = () => {
    const invalidated = invalidatePromptImprovementUndo();
    setPromptBeforeImprovement(invalidated.promptBeforeImprovement);
    setPromptImprovementError(null);
    setPromptImprovementNotice(invalidated.promptImprovementNotice);
    return invalidated;
  };

  return {
    isImprovingPrompt,
    promptBeforeImprovement,
    promptImprovementError,
    promptImprovementNotice,
    promptEnhancerConfigured,
    promptImprovementRequestGateRef,
    setPromptImprovementError,
    setPromptImprovementNotice,
    handleImprovePrompt,
    handleUndoPromptImprovement,
    invalidateUndoOnPromptEdit,
  };
}
