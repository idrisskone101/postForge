"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parsePromptTemplateRecords,
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
  const templatesRef = useRef(state.templates);
  templatesRef.current = state.templates;

  useEffect(() => {
    let active = true;
    void fetchWorkspaceFeature(PROMPT_TEMPLATE_FEATURE)
      .then(({ records }) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          templates: parsePromptTemplateRecords(records),
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
          templatesRef.current,
          { name, prompt },
          new Date()
        );
        const { records } = await saveWorkspaceFeature(
          PROMPT_TEMPLATE_FEATURE,
          record
        );
        const templates = parsePromptTemplateRecords(records);
        setState({
          templates,
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
    []
  );

  const remove = useCallback(async (id: string) => {
    setState((current) => ({ ...current, error: null }));
    try {
      const { records } = await removeWorkspaceFeature(
        PROMPT_TEMPLATE_FEATURE,
        id
      );
      setState((current) => ({
        ...current,
        templates: parsePromptTemplateRecords(records),
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
