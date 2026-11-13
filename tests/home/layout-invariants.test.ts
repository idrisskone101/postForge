import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const homeLoading = source("src/app/(app)/home-loading.tsx");
const home = [
  source("src/app/(app)/home-cockpit.tsx"),
  source("src/app/(app)/home-active-lane.tsx"),
].join("\n");
assert.match(homeLoading, /w-72 max-w-full/);
assert.match(homeLoading, /max-w-\[1280px\][^"\n]*px-4[^"\n]*pt-7/);
assert.match(home, /getJobPreview\(job, 88\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?getJobPreview\(job, 88\)/);
assert.match(source("src/app/(app)/home-cockpit.tsx"), /flex-nowrap/);
