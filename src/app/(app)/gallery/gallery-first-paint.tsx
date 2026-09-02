export function GalleryFirstPaint() {
  return (
    <div data-gallery-first-paint="true" data-gallery-page="true">
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
        <img
          alt=""
          width={390}
          height={220}
          decoding="sync"
          fetchPriority="high"
          src={GALLERY_LCP_SRC}
        />
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
  );
}

const GALLERY_LCP_SRC =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="220"><rect width="390" height="220" fill="white"/></svg>'
  );
