"use client";

import { useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PROMPT_TEMPLATE_MAX_LENGTH } from "@/lib/prompt-templates";
import { usePromptTemplates } from "./use-prompt-templates";

export function PromptTemplatesControl({
  prompt,
  onApply,
}: {
  prompt: string;
  onApply: (prompt: string) => void;
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

  function handleUse(templatePrompt: string) {
    onApply(templatePrompt.slice(0, PROMPT_TEMPLATE_MAX_LENGTH));
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted-foreground hover:bg-[var(--pf-active)] hover:text-foreground"
      >
        <Bookmark className="size-3" /> Templates
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border px-4 py-3 pr-12">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Prompt templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-4">
            <label className="block">
              <span className="sr-only">Template name</span>
              <input
                aria-label="Template name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Template name"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[12px] text-foreground shadow-none outline-none focus-visible:border-[var(--pf-orange)] focus-visible:ring-[var(--pf-orange)]/10"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || saving}
              className="pf-button-primary inline-flex h-9 w-full items-center justify-center gap-1.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save prompt
            </button>
            {error ? (
              <div
                role="alert"
                className="text-[12px] leading-4 text-[var(--pf-danger)]"
              >
                {error}
              </div>
            ) : null}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  No templates yet. Name this prompt and save it.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {templates.map((template) => (
                    <li
                      key={template.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-foreground">
                          {template.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {truncatePromptPreview(template.prompt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUse(template.prompt)}
                          className="pf-button-secondary h-8 px-2.5 text-[11px] font-semibold"
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(template.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-[var(--pf-danger)]"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function truncatePromptPreview(prompt: string) {
  const previewLength = 96;
  const normalized = prompt.trim();
  if (normalized.length <= previewLength) {
    return normalized;
  }
  return `${normalized.slice(0, previewLength - 1)}…`;
}
