import assert from "node:assert/strict";
import { appSearchParamsToQuery } from "../../src/lib/search-params-query";

assert.equal(appSearchParamsToQuery({}), "");
assert.equal(appSearchParamsToQuery({ prompt: "kitchen demo" }), "prompt=kitchen+demo");
assert.equal(
  appSearchParamsToQuery({ id: ["a", "b"], empty: "", missing: undefined }),
  "id=a&id=b"
);

console.log("search-params-query.test.ts passed");
