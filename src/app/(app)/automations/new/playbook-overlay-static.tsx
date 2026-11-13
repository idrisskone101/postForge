import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";
import { PlaybookOverlayShell } from "./automation-playbook-overlay";
import { firstPaintPlaybookPicker, resolvePlaybookTemplate } from "./playbook-model";
import { PlaybookPicker } from "./playbook-picker";

export function PlaybookOverlayStatic({ templateId }: { templateId: unknown }) {
  const selectedTemplate = resolvePlaybookTemplate(templateId);
  const picker = firstPaintPlaybookPicker(selectedTemplate);
  return (
    <div data-playbook-first-paint="true" className="flex min-h-0 flex-1 flex-col gap-3">
      <AutomationBuilderSkeleton />
      <PlaybookOverlayShell picker={picker} selectedTemplate={selectedTemplate} firstPaint>
        <PlaybookPicker picker={picker} />
      </PlaybookOverlayShell>
    </div>
  );
}
