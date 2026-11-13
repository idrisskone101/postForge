"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, EmptyState, Skeleton } from "@/components/workbench";
import {
  PROMPT_TEMPLATE_NAME_MAX_LENGTH,
  PROMPT_TEMPLATE_PROMPT_MAX_LENGTH,
  truncatePromptPreview,
} from "@/lib/prompt-templates";
import { usePromptTemplates } from "./use-prompt-templates";

export function PromptTemplatesControl({
  prompt,
  onPromptChange,
}: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { templates, loading, error, saving, save, remove } = usePromptTemplates();

  const trimmedName = name.trim();
  const trimmedPrompt = prompt.trim();
  const canSave = trimmedName.length > 0 && trimmedPrompt.length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    const saved = await save(trimmedName, prompt);
    if (saved) {
      setName("");
    }
  }

  function handleApply(templatePrompt: string) {
    onPromptChange(templatePrompt.slice(0, PROMPT_TEMPLATE_PROMPT_MAX_LENGTH));
    setOpen(false);
  }

  return (
    <>
      <Button size={32} aria-label="Prompt templates" onClick={() => setOpen(true)}>
        Templates
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] flex-col gap-4 sm:max-w-[460px]">
          <DialogHeader className="min-h-7 justify-center pr-10">
            <DialogTitle className="wb-panel-title">Prompt templates</DialogTitle>
          </DialogHeader>
          <div className="flex min-w-0 gap-2">
            <input
              aria-label="Template name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
              maxLength={PROMPT_TEMPLATE_NAME_MAX_LENGTH}
              className="wb-input min-w-0 flex-1"
            />
            <Button
              variant="strong"
              size={40}
              aria-label="Save prompt"
              disabled={!canSave || saving}
              onClick={() => void handleSave()}
              className="shrink-0"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
          {error ? (
            <div role="alert" className="wb-notice" data-tone="bad">
              {error}
            </div>
          ) : null}
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {loading ? (
              <div role="status" aria-label="Loading templates…" className="flex flex-col gap-2">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} shape="tile" className="h-[62px]" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon="list"
                title="No templates yet. Name this prompt and save it."
                className="min-h-0 py-8"
              />
            ) : (
              <ul className="flex flex-col">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex min-w-0 items-center gap-2 rounded-lg transition-colors duration-160 ease-pf hover:bg-raised"
                  >
                    <button
                      type="button"
                      onClick={() => handleApply(template.prompt)}
                      aria-label={`Use ${template.name}`}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg py-3 pl-3 text-left"
                    >
                      <span className="truncate text-[14px] font-semibold leading-[18px] text-fg">
                        {template.name}
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-[18px] text-fg-muted">
                        {truncatePromptPreview(template.prompt)}
                      </span>
                    </button>
                    <Button
                      size={32}
                      aria-label={`Delete ${template.name}`}
                      onClick={() => void remove(template.id)}
                      className="mr-2 shrink-0 bg-transparent text-fg-secondary hover:text-bad"
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
