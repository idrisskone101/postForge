import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomeLoading from "../../src/app/(app)/home-loading";

const markup = renderToStaticMarkup(<HomeLoading />);

assert.doesNotMatch(markup, /Daily production cockpit/);
assert.doesNotMatch(markup, /pf-eyebrow/);
assert.match(markup, /Spend today/);
assert.match(markup, /Review queue/);
assert.match(markup, /Recent media/);
assert.match(markup, /In progress/);
assert.match(markup, /Start new work/);
assert.match(markup, /Jobs running/);
