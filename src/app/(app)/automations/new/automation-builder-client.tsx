"use client";

import { useState } from "react";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import { AutomationPlaybookOverlayLazy } from "./automation-playbook-overlay-lazy";
import type { AutomationBuilderSearch } from "./automation-builder-search";
import { AutomationBuilderSessionLazy } from "./automation-builder-session-lazy";
import { usePlaybookEntry } from "./use-playbook-entry";

export function AutomationBuilderClient({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const editId = typeof search.id === "string" ? search.id : null;
  const requestedTemplate =
    typeof search.template === "string" ? search.template : "story-lesson";
  const initialTemplateId = AUTOMATION_TEMPLATES.some((template) => template.id === requestedTemplate)
    ? requestedTemplate
    : AUTOMATION_TEMPLATES[0].id;
  const [templateOpen, setTemplateOpen] = useState(!editId);
  const [appliedTemplate, setAppliedTemplate] = useState(initialTemplateId);
  const { playbookPicker, selectedTemplate } = usePlaybookEntry({
    initialTemplateId,
    onClose: () => setTemplateOpen(false),
  });

  if (!templateOpen) {
    return (
      <AutomationBuilderSessionLazy
        search={{ ...search, template: appliedTemplate }}
      />
    );
  }

  return (
    <div
      data-automation-builder="true"
      data-picker-open={templateOpen ? "true" : undefined}
      className="pf-content-viewport flex flex-col bg-[var(--pf-canvas)]"
    >
      <header className="flex h-[82px] shrink-0 items-center border-b border-border bg-[var(--pf-active)] px-4 sm:px-6" />
      <div data-automation-phases="true" className="h-[59px] shrink-0 border-b border-[var(--pf-border)] bg-white" />
      <section data-automation-workspace="true" className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside data-automation-form="true" />
        <div data-automation-preview="true" />
      </section>
      <AutomationPlaybookOverlayLazy
        picker={playbookPicker}
        selectedTemplate={selectedTemplate}
        onApply={(templateId) => {
          setAppliedTemplate(templateId);
          setTemplateOpen(false);
        }}
      />
    </div>
  );
}
