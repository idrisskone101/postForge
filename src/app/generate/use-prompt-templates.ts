"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROMPT_TEMPLATE_FEATURE,
  promptTemplateToSave,
  type PromptTemplateRecord,
} from "@/lib/prompt-templates";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { userErrorMessage } from "@/lib/user-error-message";

type PromptTemplatesState = {
  templates: PromptTemplateRecord[];
  loading: boolean;
  error: string | null;
  saving: boolean;
};

export function usePromptTemplates() {
  const [state, setState] = useState<PromptTemplatesState>({
    templates: [],
    loading: true,
    error: null,
    saving: false,
  });

  useEffect(() => {
    let active = true;
    void fetchWorkspaceFeature<PromptTemplateRecord>(PROMPT_TEMPLATE_FEATURE)
      .then(({ records }) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          templates: records,
          loading: false,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: userErrorMessage(error, "Failed to load prompt templates."),
        }));
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(
    async (name: string, prompt: string): Promise<PromptTemplateRecord | null> => {
      setState((current) => ({ ...current, saving: true, error: null }));
      try {
        const record = promptTemplateToSave(
          state.templates,
          { name, prompt },
          new Date()
        );
        const { records } = await saveWorkspaceFeature(
          PROMPT_TEMPLATE_FEATURE,
          record
        );
        setState({
          templates: records,
          loading: false,
          error: null,
          saving: false,
        });
        return record;
      } catch (error: unknown) {
        setState((current) => ({
          ...current,
          saving: false,
          error: userErrorMessage(error, "Failed to save prompt template."),
        }));
        return null;
      }
    },
    [state.templates]
  );

  const remove = useCallback(async (id: string) => {
    setState((current) => ({ ...current, error: null }));
    try {
      const { records } = await removeWorkspaceFeature<PromptTemplateRecord>(
        PROMPT_TEMPLATE_FEATURE,
        id
      );
      setState((current) => ({
        ...current,
        templates: records,
      }));
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        error: userErrorMessage(error, "Failed to delete prompt template."),
      }));
    }
  }, []);

  return {
    templates: state.templates,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    save,
    remove,
  };
}
