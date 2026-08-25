import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const pkg = source("package.json");
const shell = source("src/components/workspace-shell.tsx");
const sidebar = source("src/components/sidebar.tsx");
const sheet = source("src/components/ui/sheet.tsx");
const appLayout = source("src/app/(app)/layout.tsx");
const legalLayout = source("src/app/(legal)/layout.tsx");
const globalStyles = source("src/app/globals.css");
const generationStudio = source("src/components/generation-form.tsx");
const generationEditor = source("src/app/(app)/generate/[id]/page.tsx");
const cloneStudio = source("src/components/ugc-clone-form.tsx");
const cloneReferenceReview = source("src/components/clone/reference-review.tsx");
const gallery = source("src/app/(app)/gallery/gallery-page-client.tsx");
const collections = source("src/app/(app)/collections/collections-page-client.tsx");
const characters = source("src/app/(app)/characters/characters-page-client.tsx");
const characterBuilder = source(
  "src/app/(app)/characters/new/character-builder-client.tsx"
);
const performance = source("src/app/(app)/performance/performance-page-client.tsx");
const settings = source("src/app/(app)/settings/settings-page-client.tsx");
const automations = source("src/app/(app)/automations/automations-page-client.tsx");
const automationBuilder = source(
  "src/app/(app)/automations/new/automation-builder-client.tsx"
);
const alertDialog = source("src/components/ui/alert-dialog.tsx");
const dialog = source("src/components/ui/dialog.tsx");
const homeLoading = source("src/app/(app)/home-loading.tsx");
const inspirationLoading = source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx");
const galleryLoading = source("src/app/(app)/gallery/gallery-page-client.tsx");
const spendLoading = source("src/app/(app)/costs/spend-page-content.tsx");
const generationLoading = source("src/app/(app)/generate/form-controls.tsx");
const cloneLoading = source("src/app/(app)/ugc-clone/page.tsx");
const clonePage = source("src/app/(app)/ugc-clone/page.tsx");
const cloneDetailPage = source("src/app/(app)/ugc-clone/[id]/page.tsx");
const generationDetailLoading = source("src/app/(app)/generate/[id]/page.tsx");
const automationBuilderPage = source("src/app/(app)/automations/new/page.tsx");
const characterBuilderPage = source("src/app/(app)/characters/new/page.tsx");
const inspirationPage = source("src/app/(app)/ugc-inspiration/page.tsx");
const inspiration = source(
  "src/app/(app)/ugc-inspiration/inspiration-page-client.tsx"
);
const tiktokInput = source("src/components/tiktok-input.tsx");
const cloneQueue = source("src/components/ugc-clone-queue.tsx");
const videoTrimmer = source("src/components/video-trimmer.tsx");
const avatarPicker = source("src/components/avatar-picker.tsx");
const avatarPickerImport = source("src/components/avatar-picker-import.tsx");
const avatarPickerGenerate = source("src/components/avatar-picker-generate.tsx");
const galleryGrid = source("src/components/gallery-grid.tsx");
const home = source("src/app/(app)/home-cockpit.tsx");

const routeSurfaces = [
  source("src/app/(app)/home-cockpit.tsx"),
  source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx"),
  cloneStudio,
  source("src/components/clone-output-review-detail.tsx"),
  gallery,
  source("src/components/gallery-grid.tsx"),
  automations,
  automationBuilder,
  performance,
  source("src/app/(app)/costs/costs-page-client.tsx"),
  generationStudio,
  generationEditor,
  collections,
  characters,
  characterBuilder,
  settings,
].join("\n");

// One responsive shell owns document overflow and every route inherits it.
assert.match(appLayout, /<WorkspaceShell pathname=\{pathname\}>\{children\}<\/WorkspaceShell>/);
assert.doesNotMatch(legalLayout, /WorkspaceShell|Sidebar/);
assert.match(shell, /min-h-dvh min-w-0 overflow-x-hidden/);
assert.match(globalStyles, /body\s*\{[\s\S]*?min-width:\s*320px;/);
assert.match(globalStyles, /\.pf-content-viewport\s*\{[\s\S]*?100dvh/);
assert.match(appLayout, /viewportFit:\s*"cover"/);
assert.match(legalLayout, /viewportFit:\s*"cover"/);

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
assert.match(appLayout, /postforge-sidebar-collapsed/);
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
assert.match(generationEditor, /max-w-md/);
assert.match(generationEditor, /max-w-full/);
assert.match(routeSurfaces, /\[overflow-wrap:anywhere\]/);

// Loading views reflow inside their cards instead of relying on shell clipping.
assert.match(inspirationLoading, /max-w-\[1280px\]/);
assert.match(
  generationLoading,
  /mt-3 flex h-\[6\.75rem\] flex-wrap gap-1\.5 overflow-hidden/,
);
assert.match(homeLoading, /w-72 max-w-full/);
assert.match(galleryLoading, /data-gallery-tool-row="true"/);
assert.match(galleryLoading, /flex-nowrap/);
assert.match(spendLoading, /lg:w-72/);
assert.match(spendLoading, /flex flex-wrap items-center gap-2/);
assert.match(homeLoading, /max-w-\[1280px\][^"\n]*px-4[^"\n]*pt-5/);
assert.match(inspirationLoading, /px-4 py-5[^"\n]*lg:py-7/);
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
assert.match(home, /getJobPreview\(job, 88\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?getJobPreview\(job, 88\)/);
assert.match(generationStudio, /prompt\.trim\(\)\.slice\(0, 112\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?prompt\.trim\(\)\.slice\(0, 112\)/);
assert.match(galleryGrid, /item\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?item\.prompt/);
assert.match(galleryGrid, /lightbox\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?lightbox\.prompt/);
assert.match(cloneStudio, /CloneReferenceReview/);
assert.match(cloneReferenceReview, /selectedRef\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?selectedRef\.prompt/);

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
assert.match(generationStudio, /bg-\[#09090B\]/);
assert.match(generationEditor, /bg-\[#09090B\]/);
assert.match(generationEditor, /job\.prompt[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(generationEditor, /negativePrompt[\s\S]*?\[overflow-wrap:anywhere\]/);

// Dashboard Tailwind must not block first paint; legal routes stay off that bundle.
assert.doesNotMatch(appLayout, /dashboard-critical\.css/);
assert.match(appLayout, /\/dashboard\.css/);
assert.match(appLayout, /rel="preload"/);
assert.match(appLayout, /media="print"/);
assert.doesNotMatch(appLayout, /requestAnimationFrame/);
assert.match(appLayout, /FIRST_PAINT_CSS/);
assert.doesNotMatch(legalLayout, /from "\.\.\/first-paint-css"/);
assert.doesNotMatch(appLayout, /isPublicPolicyPath/);
assert.match(legalLayout, /LEGAL_FIRST_PAINT_CSS/);
assert.ok(
  appLayout.indexOf("<WorkspaceShell") < appLayout.indexOf("<Sidebar"),
  "workspace heading HTML must precede sidebar SVG so LCP can paint before the nav tree",
);
assert.match(appLayout, /from "@\/components\/sidebar-lazy"/);
assert.doesNotMatch(appLayout, /from "@\/components\/sidebar";/);
assert.match(source("src/app/(app)/generate/page.tsx"), /GenerationFormLazy/);
assert.match(source("src/components/slideshow/slideshow-studio-islands.tsx"), /ssr:\s*false/);
assert.match(source("src/app/first-paint-css.ts"), /#workspace-sidebar\{display:none\}/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-automation-fields="true"\]\{height:29\.625rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-workspace-state="empty"\]\{height:340px/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-stats="true"\]>article\{height:158px/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-generate-model-grid="true"\]>button\{height:8\.125rem/);
assert.match(source("src/app/first-paint-css.ts"), /#workspace-header,#workspace-header-grid\{height:9\.1875rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-gallery-toolbar="true"\]\{height:15\.375rem/);
assert.doesNotMatch(source("src/app/first-paint-css.ts"), /@media \(max-width:767\.98px\)\{\[data-gallery-toolbar/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-controls="true"\]\{/);
assert.match(source("src/app/first-paint-css.ts"), /\.pf-safe-overlay\{position:fixed;inset:0/);
assert.match(source("src/app/(app)/automations/new/automation-builder-client.tsx"), /data-automation-overlay="true"/);
assert.match(source("src/app/(app)/automations/new/automation-builder-client.tsx"), /position: "fixed"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-page="true"/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-jobs-summary="true"\]\{display:grid/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-jobs-board="true"\]\{margin-top:\.75rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-gallery-filters="true"\]\{display:grid/);
assert.match(
  source("src/app/first-paint-css.ts"),
  /\[data-generate-form="true"\]\{display:grid;gap:1rem\}/,
);
assert.match(source("src/app/first-paint-css.ts"), /\[data-home-glance="true"\]\{display:grid/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-home-glance-label\]::before\{content:attr\(data-home-glance-label\)/);
assert.match(source("src/app/first-paint-css.ts"), /\.pf-empty-stage\{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:650px/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-empty-note="true"\]\{display:block;height:1rem/);
assert.match(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-empty-heading="true"/);
assert.match(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-empty-copy=/);
assert.doesNotMatch(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-workspace-state="empty"/);
assert.doesNotMatch(source("src/app/first-paint-css.ts"), /data-empty-stack/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-settings-owned="true"\]/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-settings-copy="true"\]/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-intro="true"\]/);
assert.match(source("src/app/first-paint-css.ts"), /\.pf-empty-stage h2/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-empty-icon="true"\]\{width:3\.5rem;height:3\.5rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-empty-deco="true"\]\{position:relative;height:9rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-slideshow-home-body="true"\]\{width:100%/);
assert.match(source("src/app/(app)/jobs/jobs-activity.tsx"), /data-jobs-board="true"/);
assert.match(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-spend-chart-slot="true"/);
assert.match(source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx"), /next\/dynamic/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-automation-form="true"\] \.pf-input/);
assert.doesNotMatch(appLayout, /globals\.css/);
assert.doesNotMatch(appLayout, /globals\.css/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-automation-dialog="true"\]\{display:flex/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-playbook-body="true"\]\{display:grid/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-header-accessory="true"\] #workspace-header-accessory\{display:flex;width:17rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-log="true"\]>header\{display:flex/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-empty="true"\]\{height:5\.5rem/);
assert.match(source("src/app/(app)/automations/new/automation-builder-preview-pane.tsx"), /data-automation-preview-stage="true"/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-automation-preview-stage="true"\]\{display:grid;min-height:610px/);
assert.match(source("src/app/(app)/costs/spend-page-content.tsx"), /data-spend-actions="true"/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-actions="true"\]\{display:flex/);
assert.match(source("src/app/first-paint-css.ts"), /#workspace-header-default-action\{display:inline-flex;height:2\.5rem/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-chart-head="true"\]\{display:flex/);
assert.match(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-body="true"/);
assert.match(source("src/components/workspace-shell.tsx"), /data-header-accessory=\{hasAccessory \? "true" : "false"\}/);
assert.match(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-spend-empty="true"/);
assert.doesNotMatch(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-workspace-state="empty"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-count="true"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-search="true"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-tool-row="true"/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-gallery-search="true"\]\{display:flex;height:2\.25rem;width:100%/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-gallery-tool-row="true"\]\{display:flex/);
assert.match(source("src/app/globals.css"), /\[data-automation-dialog="true"\]/);
assert.match(source("src/app/globals.css"), /\[data-header-accessory="true"\] #workspace-header-accessory/);
const firstPaintCss = source("src/app/first-paint-css.ts");
assert.ok(
  firstPaintCss.lastIndexOf("[data-spend-budget=\"true\"]{flex-direction:row") >
    firstPaintCss.lastIndexOf("[data-spend-budget=\"true\"]{display:flex;flex-direction:column"),
  "desktop spend budget row must follow the stacked first-paint default",
);
assert.ok(
  firstPaintCss.lastIndexOf("[data-playbook-body=\"true\"]{grid-template-columns:170px") >
    firstPaintCss.indexOf("[data-playbook-body=\"true\"]{display:grid"),
  "desktop playbook columns must follow the stacked first-paint default",
);
assert.ok(
  firstPaintCss.lastIndexOf("[data-gallery-search=\"true\"]{width:14rem") >
    firstPaintCss.lastIndexOf("[data-gallery-search=\"true\"]{display:flex;height:2.25rem;width:100%"),
  "desktop gallery search width must follow the stacked first-paint default",
);
assert.ok(
  firstPaintCss.lastIndexOf("[data-gallery-tools=\"true\"]{flex-direction:row;flex-wrap:nowrap") >
    firstPaintCss.lastIndexOf("[data-gallery-tools=\"true\"]{display:flex;flex-direction:column"),
  "desktop gallery tools row must follow the stacked first-paint default",
);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-budget-label\]::before\{content:attr\(data-spend-budget-label\)/);
assert.match(source("src/app/first-paint-css.ts"), /#workspace-header-grid\{grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-model="true"\]::before\{content:attr\(data-spend-text\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-jobs-summary="true"\] strong::before\{content:attr\(data-jobs-value\)/);
assert.match(source("src/app/first-paint-css.ts"), /\.pf-content-viewport header h1::before\{content:attr\(data-home-title\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-settings-copy="true"\]::before\{content:attr\(data-settings-text\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-note="true"\]::before\{content:attr\(data-spend-note-text\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-empty-heading="true"\]::before\{content:attr\(data-empty-title\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-spend-value="true"\]::before\{content:attr\(data-spend-text\)/);
assert.match(source("src/app/dashboard-critical.css"), /#workspace-header-grid h1/);
assert.match(source("src/app/dashboard-critical.css"), /#workspace-header \{/);
assert.match(source("src/app/globals.css"), /#workspace-header-grid \{/);
assert.match(source("src/app/dashboard-critical.css"), /box-sizing:\s*border-box/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-home-glance="true"\]/);
assert.match(
  source("src/app/dashboard-critical.css"),
  /\[data-home-glance-label\]::before[\s\S]*?content:\s*attr\(data-home-glance-label\)/,
);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-form="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-models="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-prompt="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-sparks="true"\][\s\S]*?height:\s*6\.75rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-sparks="true"\][\s\S]*?overflow:\s*hidden/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-generate-prompt-meta="true"\][\s\S]*?height:\s*3\.5rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-workspace-state\] p[\s\S]*?height:\s*10px/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-create="true"\][\s\S]*?height:\s*52rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-home-body="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-create="true"\] textarea/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-idea="true"\][\s\S]*?padding:\s*1\.25rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-idea-title="true"\][\s\S]*?height:\s*2rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-idea-controls="true"\][\s\S]*?height:\s*8\.125rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-section-tabs="true"\][\s\S]*?height:\s*2\.5rem/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-slideshow-idea-submit="true"\][\s\S]*?height:\s*2\.5rem/);
assert.match(source("src/components/slideshow/create-view.tsx"), /data-slideshow-idea-submit="true"/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-automation-builder="true"\][\s\S]*?header[\s\S]*?height:\s*82px/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-characters-empty="true"\][\s\S]*?height:\s*650px/);
assert.match(source("src/components/slideshow/create-view.tsx"), /data-slideshow-idea="true"/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-character-category-rail="true"\] > div:first-child[\s\S]*?height:\s*4\.75rem/);
assert.match(source("src/app/dashboard-critical.css"), /\.sr-only/);
assert.match(source("src/app/(app)/generate/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/generate/generate-form-skeleton.tsx"), /data-generate-form="true"/);
assert.match(source("src/app/(app)/generate/page.tsx"), /GenerateFormSkeleton/);
assert.doesNotMatch(source("src/app/(app)/ugc-clone/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/ugc-clone/page.tsx"), /UGCCloneFormLazy/);
assert.match(source("src/app/(app)/ugc-clone/page.tsx"), /data-home-title="Clone"/);
assert.match(source("src/components/public-policy-page.tsx"), /data-policy-title=\{title\}/);
assert.match(source("src/components/public-policy-page.tsx"), /data-policy-summary=\{summary\}/);
assert.match(source("src/app/first-paint-css.ts"), /\.policy-heading::before\{content:attr\(data-policy-title\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-clone-studio="true"\]\{min-height:42rem/);
assert.match(source("src/app/(app)/ugc-clone/page.tsx"), /data-clone-studio="true"/);
assert.match(source("src/app/(app)/characters/new/character-preview-stage.tsx"), /priority/);
assert.doesNotMatch(source("src/app/(app)/characters/new/page.tsx"), /Suspense/);
assert.doesNotMatch(source("src/app/(app)/automations/new/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/automations/new/page.tsx"), /AutomationBuilderClient/);
assert.match(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-lede=/);
assert.match(source("src/app/(app)/automations/new/playbook-card.tsx"), /data-playbook-name=\{template\.name\}/);
assert.match(source("src/app/(app)/automations/new/automation-builder-client.tsx"), /data-picker-open=\{templateOpen \? "true" : undefined\}/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-playbook-name\]::before\{content:attr\(data-playbook-name\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-playbook-title\]::before\{content:attr\(data-playbook-title\)/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-automation-overlay="true"\]\{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:1rem;box-sizing:border-box;background:#09090b/);
assert.match(source("src/app/first-paint-css.ts"), /\[data-workspace-state\] h2::before\{content:attr\(data-workspace-title\)/);
assert.match(source("src/components/workspace-state.tsx"), /data-workspace-title=\{title\}/);
assert.match(source("src/app/legal-first-paint-css.ts"), /@media \(max-width:767\.98px\)\{\.policy-titleBlock\{min-height:100svh/);
assert.match(source("src/app/(app)/generate/page.tsx"), /getAvailableModelsNow/);
assert.doesNotMatch(source("src/app/(app)/generate/page.tsx"), /getAvailableModels\(/);
assert.match(source("src/app/(app)/home-cockpit.tsx"), /flex-nowrap/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-character-lcp-frame="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-character-workbench-header="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-character-category-rail="true"\]/);
assert.doesNotMatch(appLayout, /next\/font/);
assert.doesNotMatch(legalLayout, /next\/font/);
assert.doesNotMatch(source("src/app/dashboard-critical.css"), /font-geist/);
assert.match(source("src/app/(legal)/layout.tsx"), /legal\.css/);
assert.doesNotMatch(source("src/app/(legal)/layout.tsx"), /globals\.css|dashboard\.css/);
assert.match(source("src/app/dashboard-critical.css"), /\.policy-heading/);
assert.match(
  source("src/app/dashboard-critical.css"),
  /\.pf-empty-stage h2[\s\S]*?font-size:\s*20px/,
);
assert.match(source("src/app/(app)/collections/collections-page-client.tsx"), /data-empty-heading="true"/);
assert.match(source("src/app/(app)/automations/automations-page-client.tsx"), /data-empty-heading="true"/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-empty-heading="true"\]/);
assert.match(source("src/app/globals.css"), /\.pf-empty-stage h2[\s\S]*?white-space:\s*nowrap/);
assert.match(source("src/app/globals.css"), /\[data-empty-copy\]::before[\s\S]*?content:\s*attr\(data-empty-copy\)/);
assert.match(settings, /data-settings-nav="true"/);
assert.match(settings, /data-settings-panel="true"/);
assert.match(source("src/app/(app)/settings/integrations-panel.tsx"), /data-settings-owned="true"/);
assert.match(source("src/app/(app)/settings/integrations-panel.tsx"), /data-settings-copy="true"/);
assert.match(source("src/app/(app)/settings/social-integration-card.tsx"), /data-settings-copy="true"/);
assert.match(spendLoading, /data-spend-intro="true"/);
assert.match(spendLoading, /spend-budget-dialog/);
assert.doesNotMatch(spendLoading, /TooltipProvider/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-settings-owned="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-settings-copy="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-settings-panel="true"\]/);
assert.match(source("src/app/dashboard-critical.css"), /\[data-spend-intro="true"\]/);
assert.match(source("src/app/globals.css"), /\[data-settings-owned="true"\]/);
assert.match(source("src/app/globals.css"), /\[data-spend-intro="true"\]/);
assert.match(pkg, /"prebuild": "node scripts\/build-dashboard-css\.mjs && node scripts\/build-first-paint-css\.mjs"/);
assert.match(pkg, /"build:first-paint-css": "node scripts\/build-first-paint-css\.mjs"/);
assert.match(source("scripts/build-dashboard-css.mjs"), /public\/dashboard\.css/);
assert.match(source("scripts/build-first-paint-css.mjs"), /dashboard-critical\.css/);
assert.match(pkg, /"predev": "node scripts\/build-dashboard-css\.mjs && node scripts\/build-first-paint-css\.mjs"/);

console.log("responsive layout invariant tests passed");
