"use client";

import { useState } from "react";
import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import { userErrorMessage } from "@/lib/user-error-message";
import { postVibeExtract, postVibeFold } from "./generation-requests";

export function useGenerationVibe() {
  const [vibeTemplate, setVibeTemplate] = useState<SlideshowAestheticTemplate | null>(
    null
  );
  const [vibeJsonText, setVibeJsonText] = useState("");
  const [vibeEditorActive, setVibeEditorActive] = useState(false);
  const [vibeJsonError, setVibeJsonError] = useState<string | null>(null);
  const [vibeExtracting, setVibeExtracting] = useState(false);
  const [vibeExtractError, setVibeExtractError] = useState<string | null>(null);
  const [vibeAssetKey, setVibeAssetKey] = useState<string | null>(null);
  const [foldEnabled, setFoldEnabled] = useState(false);
  const [vibeFolding, setVibeFolding] = useState(false);
  const [vibeFoldError, setVibeFoldError] = useState<string | null>(null);
  const [foldedPromptValue, setFoldedPromptValue] = useState<string | null>(null);

  const resetVibeState = () => {
    setVibeTemplate(null);
    setVibeJsonText("");
    setVibeEditorActive(false);
    setVibeJsonError(null);
    setVibeExtractError(null);
    setVibeAssetKey(null);
    setVibeFoldError(null);
    setFoldedPromptValue(null);
  };

  const handleExtractVibe = async (collectionAssetIds: string[]) => {
    if (collectionAssetIds.length === 0 || vibeExtracting) return;
    setVibeExtracting(true);
    setVibeExtractError(null);
    setVibeFoldError(null);
    try {
      const result = await postVibeExtract(collectionAssetIds);
      setVibeTemplate(result.template);
      setVibeJsonText(JSON.stringify(result.template, null, 2));
      setVibeEditorActive(true);
      setVibeJsonError(null);
      setVibeAssetKey(collectionAssetIds.join(","));
      setFoldedPromptValue(null);
      return `Vibe JSON extracted from ${result.referenceCount} collection image${result.referenceCount === 1 ? "" : "s"} with ${result.model}. Review and edit it before generating.`;
    } catch (error) {
      setVibeExtractError(
        userErrorMessage(error, "Vibe extraction failed. Your selection is unchanged.")
      );
      return null;
    } finally {
      setVibeExtracting(false);
    }
  };

  const handleVibeJsonChange = (text: string) => {
    setVibeJsonText(text);
    setFoldedPromptValue(null);
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      setVibeTemplate(parsed as SlideshowAestheticTemplate);
      setVibeJsonError(null);
    } catch {
      setVibeTemplate(null);
      setVibeJsonError("The vibe JSON is invalid. Fix it or re-extract.");
    }
  };

  const handleFoldIntoVibe = async (prompt: string) => {
    if (!vibeTemplate || vibeFolding) return;
    const currentPrompt = prompt.trim();
    if (!currentPrompt) {
      setVibeFoldError("Write a prompt before folding it into the vibe JSON.");
      return null;
    }
    setVibeFolding(true);
    setVibeFoldError(null);
    try {
      const result = await postVibeFold({
        template: vibeTemplate,
        prompt: currentPrompt,
      });
      setVibeTemplate(result.template);
      setVibeJsonText(JSON.stringify(result.template, null, 2));
      setVibeJsonError(null);
      setFoldedPromptValue(currentPrompt);
      return "Your prompt was folded into the vibe JSON. Review it before generating.";
    } catch (error) {
      setVibeFoldError(
        userErrorMessage(error, "Folding failed. Your vibe JSON is unchanged.")
      );
      return null;
    } finally {
      setVibeFolding(false);
    }
  };

  return {
    vibeTemplate,
    vibeJsonText,
    vibeEditorActive,
    vibeJsonError,
    vibeExtracting,
    vibeExtractError,
    vibeAssetKey,
    foldEnabled,
    vibeFolding,
    vibeFoldError,
    foldedPromptValue,
    setFoldEnabled,
    setVibeFoldError,
    resetVibeState,
    handleExtractVibe,
    handleVibeJsonChange,
    handleFoldIntoVibe,
  };
}
