import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateOutputActions } from "../../src/components/generate-output-actions";

const markup = renderToStaticMarkup(
  <GenerateOutputActions
    canDownload
    isRetrying={false}
    onDownload={() => {}}
    onRetry={() => {}}
    onSaveToGallery={() => {}}
    onUseInClone={() => {}}
  />
);

assert.match(markup, /Download/);
assert.match(markup, /Retry/);
assert.match(markup, /Save to Gallery/);
assert.match(markup, /Use in Clone/);
assert.doesNotMatch(markup, /Launch Forge/);
