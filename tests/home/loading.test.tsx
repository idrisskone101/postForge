import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomeLoading from "../src/app/loading";

const markup = renderToStaticMarkup(<HomeLoading />);

assert.match(markup, /Daily production cockpit/);
assert.match(markup, /Spend today/);
assert.match(markup, /In progress/);
assert.match(markup, /Needs review/);
assert.match(markup, /Start new work/);
