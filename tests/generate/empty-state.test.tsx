import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateEmptyState } from "../../src/components/generation-form";

const markup = renderToStaticMarkup(<GenerateEmptyState />);

assert.match(markup, /data-workspace-state="empty"/);
assert.match(markup, /No generation models available/);
assert.match(markup, /Open Clone/);
assert.match(markup, /Return Home/);
