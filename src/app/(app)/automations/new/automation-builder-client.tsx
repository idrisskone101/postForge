"use client";

import { useLayoutEffect, useState } from "react";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";
import { AutomationPlaybookOverlay } from "./automation-playbook-overlay";
import type { AutomationBuilderSearch } from "./automation-builder-search";
import { AutomationBuilderSessionLazy } from "./automation-builder-session-lazy";
import { handOffPlaybookFirstPaint } from "./playbook-first-paint";
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
  const [templateOpen, setTemplateOpen] = useState(
    !editId && search.intent !== "apply"
  );
  const [appliedTemplate, setAppliedTemplate] = useState(initialTemplateId);
  const { playbookPicker, selectedTemplate } = usePlaybookEntry({
    initialTemplateId,
    onClose: () => setTemplateOpen(false),
  });
  useLayoutEffect(handOffPlaybookFirstPaint, []);

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
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <AutomationBuilderSkeleton />
      <AutomationPlaybookOverlay
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
