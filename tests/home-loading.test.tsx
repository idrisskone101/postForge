import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomeLoading from "../src/app/loading";

const markup = renderToStaticMarkup(<HomeLoading />);

assert.match(markup, /Daily Production Loop/);
assert.match(markup, /Compact Spend/);
assert.match(markup, /Active jobs/);
assert.match(markup, /Pending review/);
