import Link from "next/link";
import { getActiveWorkspaceItem } from "@/lib/workspace-navigation";

export function GalleryFirstPaint() {
  const gallery = getActiveWorkspaceItem("/gallery");
  const title = gallery?.label ?? "Gallery";
  const copy = gallery?.description ?? "";

  return (
    <div data-gallery-first-paint="true">
      <style>{GALLERY_TITLE_CSS}</style>
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
            <div data-gallery-title="true" role="heading" aria-level={1}>
              <img
                alt=""
                width={192}
                height={31}
                decoding="sync"
                loading="eager"
                fetchPriority="high"
                src={GALLERY_TITLE_SRC}
              />
              <span className="sr-only">{title}</span>
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
              <Link
                href="/ugc-clone"
                prefetch={false}
                className="pf-button-secondary shrink-0 whitespace-nowrap"
              >
                Start Clone
              </Link>
              <Link
                href="/generate"
                prefetch={false}
                className="pf-button-primary shrink-0 whitespace-nowrap"
              >
                Generate asset
              </Link>
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
            <Link href="/ugc-clone" prefetch={false} className="pf-button-primary">
              Start Clone
            </Link>
            <Link href="/generate" prefetch={false} className="pf-button-secondary">
              Open Generate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const GALLERY_TITLE_CSS =
  '[data-gallery-title="true"]{margin:0!important;width:12rem!important;max-width:12rem!important;height:31px!important;overflow:hidden!important}[data-gallery-title="true"] img{display:block!important;width:192px!important;height:31px!important;max-width:192px!important}';

const GALLERY_TITLE_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="31"><text x="0" y="24" font-size="28" font-weight="600" font-family="ui-sans-serif,system-ui,sans-serif" fill="rgb(24,24,27)">Gallery</text></svg>',
)}`;
