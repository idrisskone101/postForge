import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const cloneStudio = source("src/components/ugc-clone-form.tsx");
const cloneReferenceReview = source("src/components/clone/reference-review.tsx");
const cloneLoading = source("src/app/(app)/ugc-clone/page.tsx");
const tiktokInput = source("src/components/tiktok-input.tsx");
const cloneQueue = source("src/components/ugc-clone-queue.tsx");
const videoTrimmer = source("src/components/video-trimmer.tsx");
const avatarPicker = source("src/components/avatar-picker.tsx");
const avatarPickerImport = source("src/components/avatar-picker-import.tsx");
const avatarPickerGenerate = source("src/components/avatar-picker-generate.tsx");
// The shell owns page padding and width. The route renders its header and
// panels as direct children, and stacks the 380px rail below 1280.
assert.match(cloneStudio, /flex min-w-0 gap-3 max-xl:flex-col/);
assert.match(cloneStudio, /w-\[380px\] shrink-0[^"\n]*max-xl:w-full/);
assert.doesNotMatch(cloneLoading, /max-w-\[|px-4|pf-content-viewport/);
assert.match(cloneLoading, /<PageHeader title="Clone">/);

// Provider and media failures can contain long opaque tokens. They must wrap

// at the exact legacy surfaces that render those strings.
for (const failureSurface of [
  tiktokInput,
  cloneQueue,
  videoTrimmer,
  avatarPickerImport,
  avatarPickerGenerate,
]) {
  assert.match(failureSurface, /\[overflow-wrap:anywhere\]/);
}
assert.match(tiktokInput, /sourcesError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(cloneQueue, /loadError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(videoTrimmer, /trimError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPicker, /AvatarImportMode/);
assert.match(avatarPicker, /AvatarGeneratePanel/);
assert.match(avatarPickerImport, /readiness\.jsonError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPickerImport, /readiness\.seedError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPickerImport, /generationError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(
  avatarPickerGenerate,
  /isFailed[\s\S]*?\[overflow-wrap:anywhere\][\s\S]*?genJob\?\.error/
);
assert.match(cloneStudio, /CloneReferenceReview/);
assert.match(cloneReferenceReview, /selectedRef\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?selectedRef\.prompt/);
assert.doesNotMatch(source("src/app/(app)/ugc-clone/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/ugc-clone/page.tsx"), /UGCCloneFormLazy/);
for (const file of [
  "src/app/(app)/ugc-clone/clone-owned-header.tsx",
  "src/components/clone/source-step.tsx",
  "src/components/ugc-clone-form.tsx",
]) {
  assert.doesNotMatch(source(file), /data-clone-copy|sr-only|data-home-title/);
}
assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-clone-copy/);
assert.match(
  source("src/components/ugc-clone-form-lazy.tsx"),
  /useWindowLoadReady/,
);

// Output previews in the recent-clones list load only near the viewport, and only the
// first saved-source thumbnail is fetched eagerly.
assert.match(cloneQueue, /<DeferredVideoFrame\s+src=\{`\/api\/files\/\$\{output\.id\}#t=0\.1`\}/);
assert.doesNotMatch(cloneQueue, /<video/);
assert.match(source("src/components/deferred-video-frame.tsx"), /src=\{near \? src : undefined\}/);
assert.match(source("src/components/tiktok-saved-sources.tsx"), /loading=\{index === 0 \? "eager" : "lazy"\}/);
