import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";

export function PlaybookOverlayStatic() {
  const selectedTemplate = AUTOMATION_TEMPLATES[0];
  return (
    <div
      data-playbook-first-paint="true"
      data-automation-overlay="true"
      className="pf-safe-overlay fixed inset-0 z-[80] grid place-items-center bg-black/50"
      style={{ position: "fixed", inset: 0, zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-title"
    >
      <div
        data-automation-dialog="true"
        className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl sm:rounded-[20px]"
      >
        <header
          data-playbook-chrome="true"
          className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-4 py-4 sm:px-5"
        >
          <div>
            <h2 id="template-title" data-playbook-title="Choose a playbook">
              <span className="sr-only">Choose a playbook</span>
            </h2>
            <p data-playbook-lede="Start with a proven Hook, Content, and CTA structure.">
              <span className="sr-only">
                Start with a proven Hook, Content, and CTA structure. Preview it,
                select it, then apply when you are ready.
              </span>
            </p>
          </div>
        </header>
        <div
          data-playbook-body="true"
          className="min-h-0 flex-1 overflow-hidden"
          style={{ minHeight: "24rem" }}
        />
        <footer
          data-playbook-footer="true"
          className="flex shrink-0 flex-col gap-3 border-t border-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <b data-playbook-name={selectedTemplate.name}>
            <span className="sr-only">{selectedTemplate.name}</span>
          </b>
          <a href="/automations" data-lcp="Cancel">
            <span className="sr-only">Cancel</span>
          </a>
          <a
            href={`/automations/new?template=${selectedTemplate.id}&intent=apply`}
            data-lcp="Apply playbook"
          >
            <span className="sr-only">Apply playbook</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
