export function CharacterBuilderStatic() {
  return (
    <div
      data-character-first-paint="true"
      data-character-workbench="true"
      className="pf-content-viewport bg-[var(--pf-canvas)]"
    >
      <header data-character-workbench-header="true">
        <div>
          <h1 data-character-title="Character builder">
            <span className="sr-only">Character builder</span>
          </h1>
        </div>
        <label style={{ height: 36, overflow: "hidden" }}>
          <span className="sr-only">Character name</span>
        </label>
        <div style={{ height: 36, overflow: "hidden" }} />
      </header>
      <aside data-character-category-rail="true" data-character-recipe-step-rail="true">
        <div>
          <div>
            <p data-character-rail-kicker="Attribute recipe">
              <span className="sr-only">Attribute recipe</span>
            </p>
          </div>
        </div>
        <nav aria-label="Character attribute recipe" />
      </aside>
      <section
        data-character-preview-stage="true"
        aria-label="Live character portrait"
      >
        <div>
          <div>
            <p data-character-preview-label="Photographic recipe preview">
              <span className="sr-only">Photographic recipe preview</span>
            </p>
            <p
              id="character-preview-generation-cost"
              data-character-cost="Save as a draft without generating. Render a preview when you want to make this identity reusable."
            >
              <span className="sr-only">
                Save as a draft without generating. Render a preview when you
                want to make this identity reusable.
              </span>
            </p>
          </div>
          <span
            role="status"
            data-character-status="Draft — preview optional"
          >
            <span className="sr-only">Draft — preview optional</span>
          </span>
        </div>
        <div>
          <div
            data-character-lcp-frame="true"
            className="overflow-hidden rounded-lg border border-white/10"
            style={FRAME_STYLE}
          />
        </div>
      </section>
      <section data-character-attribute-editor="true" hidden />
    </div>
  );
}

const FRAME_STYLE = {
  position: "relative",
  width: "100%",
  maxWidth: 390,
  height: 520,
  backgroundColor: "#111113",
} as const;
