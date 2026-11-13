import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomeLoading from "../../src/app/(app)/home-loading";

const markup = renderToStaticMarkup(<HomeLoading />);

// The skeleton keeps the real labels and titles so nothing shifts when data lands
assert.match(markup, /Jobs running/);
assert.match(markup, /Awaiting review/);
assert.match(markup, /Completed this week/);
assert.match(markup, /Spend today/);
assert.match(markup, /Review queue/);
assert.match(markup, /In progress/);
assert.match(markup, /Recent media/);
assert.doesNotMatch(markup, /Start new work/);
assert.match(markup, /aria-busy="true"/);
// Static placeholders only: no shimmer or pulse
assert.doesNotMatch(markup, /animate-pulse|shimmer/);
assert.equal(markup.match(/data-shape="tile"/g)?.length, 4 + 2 + 5);
