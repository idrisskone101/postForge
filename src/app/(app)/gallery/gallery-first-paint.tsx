import { getActiveWorkspaceItem } from "@/lib/workspace-navigation";

export function GalleryFirstPaint() {
  const gallery = getActiveWorkspaceItem("/gallery");
  const title = gallery?.label ?? "Gallery";
  const copy = gallery?.description ?? "";

  return (
    <div data-gallery-first-paint="true">
      <div
        id="workspace-header"
        className="border-b border-[var(--pf-border)] bg-[var(--pf-canvas)]"
      >
        <div
          id="workspace-header-grid"
          data-header-accessory="true"
          className="grid min-h-[120px] gap-4 px-5 pb-6 pt-6 sm:px-7 lg:items-end lg:px-8 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <div role="heading" aria-level={1} style={TITLE_STYLE}>
              {title}
            </div>
            <p data-header-copy={copy}>
              <span className="sr-only">{copy}</span>
            </p>
          </div>
          <div className="min-h-9 min-w-0 lg:justify-self-end">
            <div
              id="workspace-header-accessory"
              className="flex min-w-0 flex-wrap gap-2"
            >
              <a
                href="/ugc-clone"
                className="pf-button-secondary shrink-0 whitespace-nowrap"
              >
                Start Clone
              </a>
              <a
                href="/generate"
                className="pf-button-primary shrink-0 whitespace-nowrap"
              >
                Generate asset
              </a>
            </div>
          </div>
        </div>
      </div>
      <div data-gallery-first-body="true" data-gallery-page="true">
        <section data-gallery-toolbar="true" className="pf-card">
          <div>
            <div data-gallery-filters="true" />
            <div data-gallery-tools="true">
              <div data-gallery-search="true" />
              <div data-gallery-tool-row="true" />
            </div>
          </div>
        </section>
        <div data-workspace-state="empty">
          <div aria-hidden="true" />
          <div data-workspace-state-actions="true">
            <a href="/ugc-clone" className="pf-button-primary">
              Start Clone
            </a>
            <a href="/generate" className="pf-button-secondary">
              Open Generate
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const TITLE_STYLE = {
  margin: 0,
  height: 31,
  overflow: "hidden",
  fontSize: 28,
  fontWeight: 600,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  color: "var(--pf-ink)",
} as const;
