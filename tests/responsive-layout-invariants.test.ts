import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const shell = source("src/components/workspace-shell.tsx");
const sidebar = source("src/components/sidebar.tsx");
const sheet = source("src/components/ui/sheet.tsx");
const layout = source("src/app/layout.tsx");
const globalStyles = source("src/app/globals.css");
const generationStudio = source("src/components/generation-form.tsx");
const generationEditor = source("src/app/generate/[id]/page.tsx");
const cloneStudio = source("src/components/ugc-clone-form.tsx");
const gallery = source("src/app/gallery/gallery-page-client.tsx");
const collections = source("src/app/collections/collections-page-client.tsx");
const characters = source("src/app/characters/characters-page-client.tsx");
const characterBuilder = source(
  "src/app/characters/new/character-builder-client.tsx"
);
const performance = source("src/app/performance/performance-page-client.tsx");
const settings = source("src/app/settings/settings-page-client.tsx");
const automations = source("src/app/automations/automations-page-client.tsx");
const automationBuilder = source(
  "src/app/automations/new/automation-builder-client.tsx"
);
const alertDialog = source("src/components/ui/alert-dialog.tsx");
const dialog = source("src/components/ui/dialog.tsx");
const homeLoading = source("src/app/loading.tsx");
const inspirationLoading = source("src/app/ugc-inspiration/loading.tsx");
const galleryLoading = source("src/app/gallery/loading.tsx");
const spendLoading = source("src/app/costs/loading.tsx");
const generationLoading = source("src/app/generate/loading.tsx");
const cloneLoading = source("src/app/ugc-clone/loading.tsx");
const clonePage = source("src/app/ugc-clone/page.tsx");
const cloneDetailPage = source("src/app/ugc-clone/[id]/page.tsx");
const generationDetailLoading = source("src/app/generate/[id]/loading.tsx");
const automationBuilderPage = source("src/app/automations/new/page.tsx");
const characterBuilderPage = source("src/app/characters/new/page.tsx");
const inspirationPage = source("src/app/ugc-inspiration/page.tsx");
const inspiration = source(
  "src/app/ugc-inspiration/inspiration-page-client.tsx"
);
const tiktokInput = source("src/components/tiktok-input.tsx");
const cloneQueue = source("src/components/ugc-clone-queue.tsx");
const videoTrimmer = source("src/components/video-trimmer.tsx");
const avatarPicker = source("src/components/avatar-picker.tsx");
const galleryGrid = source("src/components/gallery-grid.tsx");
const home = source("src/app/home-cockpit.tsx");

const routeSurfaces = [
  source("src/app/home-cockpit.tsx"),
  source("src/app/ugc-inspiration/inspiration-page-client.tsx"),
  cloneStudio,
  source("src/components/clone-output-review-detail.tsx"),
  gallery,
  source("src/components/gallery-grid.tsx"),
  automations,
  automationBuilder,
  performance,
  source("src/app/costs/costs-page-client.tsx"),
  generationStudio,
  generationEditor,
  collections,
  characters,
  characterBuilder,
  settings,
].join("\n");

// One responsive shell owns document overflow and every route inherits it.
assert.match(layout, /<WorkspaceShell>\{children\}<\/WorkspaceShell>/);
assert.match(shell, /min-h-dvh min-w-0 overflow-x-hidden/);
assert.match(globalStyles, /body\s*\{[\s\S]*?min-width:\s*320px;/);
assert.match(globalStyles, /\.pf-content-viewport\s*\{[\s\S]*?100dvh/);
assert.match(layout, /viewportFit:\s*"cover"/);

const routeOwnedViewportSurfaces = [
  home,
  clonePage,
  cloneLoading,
  cloneDetailPage,
  source("src/components/clone-output-review-detail.tsx"),
  generationEditor,
  generationDetailLoading,
  automationBuilderPage,
  automationBuilder,
  characterBuilderPage,
  characterBuilder,
].join("\n");
assert.doesNotMatch(routeOwnedViewportSurfaces, /min-h-screen|\bh-screen\b|100vh/);
assert.match(routeOwnedViewportSurfaces, /pf-content-viewport/);
assert.doesNotMatch(inspirationPage + inspiration, /100vh/);

// The rail must fit at 72px, hydrate without a layout jump, and move fixed bars.
assert.match(sidebar, /w-\[72px\][^"\n]*xl:w-64/);
assert.match(layout, /postforge-sidebar-collapsed/);
assert.match(globalStyles, /html\[data-sidebar-collapsed="true"\] #workspace-shell/);
assert.match(globalStyles, /html\[data-sidebar-collapsed="true"\] \.workspace-sidebar-offset-left/);
assert.match(globalStyles, /#workspace-sidebar \.sidebar-brand \{\s*display: none;/);

// Primary workbenches collapse before their fixed minimum tracks can overflow.
assert.match(generationStudio, /xl:grid-cols-\[minmax\(360px,0\.72fr\)_minmax\(500px,1\.28fr\)\]/);
assert.match(cloneStudio, /lg:grid-cols-\[minmax\(420px,45fr\)_minmax\(0,55fr\)\]/);
assert.match(characterBuilder, /min-\[1280px\]:grid-cols-\[200px_minmax\(420px,1\.2fr\)_minmax\(360px,0\.8fr\)\]/);
assert.match(settings, /lg:grid-cols-\[210px_minmax\(0,1fr\)\]/);

// Dense desktop controls become scoped scrollers or mobile-native cards.
assert.match(settings, /overflow-x-auto overscroll-x-contain/);
assert.match(performance, /hidden overflow-x-auto sm:block/);
assert.match(collections, /grid-cols-2[^"\n]*min-\[420px\]:grid-cols-3/);
assert.match(gallery, /flex-col[^"\n]*sm:flex-row/);
assert.match(automations, /grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7/);
assert.match(automations, /h-36 w-full min-w-0 max-w-72/);

// Fixed notices are inset on both sides at mobile widths, never right-only.
assert.doesNotMatch(routeSurfaces, /fixed bottom-5 right-5/);
const fixedToasts = routeSurfaces.match(
  /role="status" className="fixed bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\][^"\n]+"/g
) ?? [];
assert.ok(fixedToasts.length >= 6, "expected route-level fixed feedback notices");
for (const toast of fixedToasts) {
  assert.match(toast, /left-5 right-5/);
  assert.match(toast, /min-w-0/);
}
assert.doesNotMatch(routeSurfaces, /fixed bottom-5/);
assert.match(sidebar, /safe-area-inset-top/);
assert.match(sidebar, /safe-area-inset-bottom/);
assert.match(sheet, /safe-area-inset-top/);
assert.match(sheet, /safe-area-inset-bottom/);
assert.match(collections, /safe-area-inset-bottom/);
assert.match(routeSurfaces, /sticky bottom-0[^"\n]*safe-area-inset-bottom/);

// Short viewports must be able to scroll every large custom dialog.
assert.match(characters, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(characterBuilder, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(automationBuilder, /h-full[^"\n]*max-h-\[860px\][^"\n]*overflow-hidden/);
assert.match(automationBuilder, /pf-safe-overlay/);
assert.match(automationBuilder, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(
  automationBuilder,
  /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/
);
assert.match(collections, /pt-\[env\(safe-area-inset-top\)\]/);
assert.match(alertDialog, /pf-safe-dialog-viewport/);
assert.match(alertDialog, /w-\[calc\(100%-2rem\)\]/);
assert.match(alertDialog, /overflow-y-auto/);
assert.match(dialog, /pf-safe-dialog-viewport/);
assert.match(dialog, /max-w-\[calc\(100%-2rem\)\]/);
assert.match(dialog, /overflow-y-auto/);
assert.match(globalStyles, /\.pf-safe-overlay\s*\{/);
assert.match(globalStyles, /safe-area-inset-top/);
assert.match(globalStyles, /\.pf-safe-dialog-viewport\s*\{/);

// Loading and failure states must not widen their containing cards.
assert.match(generationEditor, /h-\[560px\] w-\[315px\] max-w-full/);
assert.match(routeSurfaces, /\[overflow-wrap:anywhere\]/);

// Loading views reflow inside their cards instead of relying on shell clipping.
assert.match(inspirationLoading, /w-\[28rem\] max-w-full/);
assert.match(generationLoading, /w-\[282px\] max-w-full/);
assert.match(generationLoading, /mt-3 flex flex-wrap gap-2/);
assert.match(homeLoading, /w-72 max-w-full/);
assert.match(galleryLoading, /flex flex-wrap gap-2/);
assert.match(spendLoading, /w-72 max-w-full/);
assert.match(spendLoading, /flex flex-wrap gap-2/);
assert.match(homeLoading, /max-w-\[1280px\][^"\n]*px-4[^"\n]*pt-5/);
assert.match(inspirationLoading, /max-w-\[1280px\]/);
assert.match(inspirationLoading, /px-4 py-5[^"\n]*lg:py-7/);
assert.match(cloneLoading, /max-w-\[1280px\][^"\n]*px-4 py-6[^"\n]*lg:py-7/);

// Provider and media failures can contain long opaque tokens. They must wrap
// at the exact legacy surfaces that render those strings.
for (const failureSurface of [tiktokInput, cloneQueue, videoTrimmer, avatarPicker]) {
  assert.match(failureSurface, /\[overflow-wrap:anywhere\]/);
}
assert.match(tiktokInput, /sourcesError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(cloneQueue, /loadError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(videoTrimmer, /trimError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPicker, /readiness\.jsonError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPicker, /readiness\.seedError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(avatarPicker, /generationError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(
  avatarPicker,
  /isFailed[\s\S]*?\[overflow-wrap:anywhere\][\s\S]*?genJob\?\.error/
);
assert.match(home, /getJobPreview\(job, 88\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?getJobPreview\(job, 88\)/);
assert.match(generationStudio, /prompt\.trim\(\)\.slice\(0, 112\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?prompt\.trim\(\)\.slice\(0, 112\)/);
assert.match(galleryGrid, /item\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?item\.prompt/);
assert.match(galleryGrid, /lightbox\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?lightbox\.prompt/);
assert.match(cloneStudio, /selectedRef\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?selectedRef\.prompt/);

// Dark mode must preserve the workspace palette and status semantics.
assert.match(globalStyles, /\.dark \.pf-button-secondary:hover/);
assert.match(globalStyles, /\.dark \.pf-status-success/);
assert.match(globalStyles, /\.dark \.pf-status-warning/);
assert.match(globalStyles, /\.dark \.pf-status-danger/);
assert.match(globalStyles, /\.dark \.text-\\\[\\#238A40\\\]/);
assert.match(globalStyles, /\.dark \.text-\\\[\\#C53A32\\\]/);
assert.match(globalStyles, /\.dark \.text-\\\[\\#2A71C7\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#F0F8F2\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#EAF2FF\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#F5F8FF\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#FFF8F5\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#E9EAE4\\\]/);
assert.match(globalStyles, /\.dark \.bg-\\\[\\#E6F4E9\\\]/);
assert.match(globalStyles, /\.dark \.border-\\\[\\#F0B5AA\\\]/);
assert.match(generationStudio, /dark:bg-\[linear-gradient\(#343531_1px/);
assert.match(generationEditor, /dark:bg-\[linear-gradient\(#343531_1px/);
assert.match(generationEditor, /job\.prompt[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(generationEditor, /negativePrompt[\s\S]*?\[overflow-wrap:anywhere\]/);

console.log("responsive layout invariant tests passed");
