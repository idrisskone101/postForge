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
assert.match(cloneStudio, /lg:grid-cols-\[minmax\(420px,45fr\)_minmax\(0,55fr\)\]/);
assert.match(cloneLoading, /max-w-\[1280px\][^"\n]*px-4 py-6[^"\n]*lg:py-7/);

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
assert.match(
  source("src/components/clone/source-step.tsx"),
  /data-clone-copy="Choose the clip and trim the part to clone."/,
);
assert.match(
  source("src/app/(app)/ugc-clone/clone-owned-header.tsx"),
  /data-clone-studio=\{paintReady \? undefined : "true"\}/,
);
assert.doesNotMatch(
  source("src/app/(app)/ugc-clone/clone-owned-header.tsx"),
  /ClonePaintText/,
);
assert.match(
  source("src/app/(app)/ugc-clone/clone-owned-header.tsx"),
  /data-clone-copy=\{COPY\}/,
);
assert.match(
  source("src/components/ugc-clone-form-lazy.tsx"),
  /useWindowLoadReady/,
);
