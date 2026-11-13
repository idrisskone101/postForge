import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const shell = source("src/components/workspace-shell.tsx");
const sidebar = source("src/components/sidebar.tsx");
const sheet = source("src/components/ui/sheet.tsx");
const appLayout = source("src/app/(app)/layout.tsx");
const legalLayout = source("src/app/(legal)/layout.tsx");
const generationStudio = source("src/components/generation-form.tsx");
const generationEditor = source("src/app/(app)/generate/[id]/page.tsx");
const cloneStudio = source("src/components/ugc-clone-form.tsx");
const gallery = source("src/app/(app)/gallery/gallery-page-client.tsx");
const collections = [
  source("src/app/(app)/collections/collections-page-client.tsx"),
  source("src/app/(app)/collections/collections-library.tsx"),
  source("src/app/(app)/collections/collections-detail.tsx"),
  source("src/app/(app)/collections/collections-empty.tsx"),
].join("\n");
const characters = source("src/app/(app)/characters/characters-page-client.tsx");
const characterBuilder = source(
  "src/app/(app)/characters/new/character-builder-client.tsx"
);
const performance = source("src/app/(app)/performance/performance-page-client.tsx");
const settings = source("src/app/(app)/settings/settings-page-client.tsx");
const automations = source("src/app/(app)/automations/automations-page-client.tsx");
const automationBuilder = [
  source("src/app/(app)/automations/new/automation-builder-client.tsx"),
  source("src/app/(app)/automations/new/automation-playbook-overlay.tsx"),
  source("src/app/(app)/automations/new/automation-builder-session.tsx"),
].join("\n");
const alertDialog = source("src/components/ui/alert-dialog.tsx");
const dialog = source("src/components/ui/dialog.tsx");
const cloneLoading = source("src/app/(app)/ugc-clone/page.tsx");
const clonePage = source("src/app/(app)/ugc-clone/page.tsx");
const cloneDetailPage = source("src/app/(app)/ugc-clone/[id]/page.tsx");
const generationDetailLoading = source("src/app/(app)/generate/[id]/page.tsx");
const automationBuilderPage = source("src/app/(app)/automations/new/page.tsx");
const characterBuilderPage = source("src/app/(app)/characters/new/page.tsx");
const home = [
  source("src/app/(app)/home-cockpit.tsx"),
  source("src/app/(app)/home-active-lane.tsx"),
].join("\n");
const routeSurfaces = [
  source("src/app/(app)/home-cockpit.tsx"),
  source("src/app/(app)/home-active-lane.tsx"),
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
const fixedToasts = routeSurfaces.match(
  /role="status" className="fixed bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\][^"\n]+"/g
) ?? [];

// One responsive shell owns document overflow and every route inherits it.
assert.match(appLayout, /<WorkspaceShell pathname=\{pathname\}>\{children\}<\/WorkspaceShell>/);
assert.match(shell, /WorkspaceHeaderGate/);
assert.doesNotMatch(shell, /"use client"/);
assert.match(source("src/components/workspace-header-gate.tsx"), /usePathname\(\)/);
assert.match(source("src/components/workspace-header-gate.tsx"), /"use client"/);
assert.doesNotMatch(legalLayout, /WorkspaceShell|Sidebar/);
assert.match(appLayout, /viewportFit:\s*"cover"/);
assert.match(legalLayout, /viewportFit:\s*"cover"/);
assert.doesNotMatch(routeOwnedViewportSurfaces, /min-h-screen|\bh-screen\b|100vh/);
assert.match(routeOwnedViewportSurfaces, /pf-content-viewport/);
assert.match(appLayout, /postforge-sidebar-collapsed/);

// Fixed notices are inset on both sides at mobile widths, never right-only.
assert.doesNotMatch(routeSurfaces, /fixed bottom-5 right-5/);
for (const toast of fixedToasts ?? []) {
  assert.match(toast, /left-5 right-5/);
  assert.match(toast, /min-w-0/);
}
assert.doesNotMatch(routeSurfaces, /fixed bottom-5/);
assert.match(sheet, /safe-area-inset-top/);
assert.match(sheet, /safe-area-inset-bottom/);
assert.match(routeSurfaces, /sticky bottom-0[^"\n]*safe-area-inset-bottom/);
assert.match(alertDialog, /pf-safe-dialog-viewport/);
assert.match(alertDialog, /w-\[calc\(100%-2rem\)\]/);
assert.match(alertDialog, /overflow-y-auto/);
assert.match(dialog, /pf-safe-dialog-viewport/);
assert.match(dialog, /max-w-\[calc\(100%-2rem\)\]/);
assert.match(dialog, /overflow-y-auto/);
assert.match(routeSurfaces, /\[overflow-wrap:anywhere\]/);

// The full stylesheet is a normal render-blocking import. The inline block only
// carries the theme floor and the font faces, so there is no late restyle.
const firstPaint = source("src/app/first-paint-css.ts");
const shellStyles = source("src/app/styles/shell.css");
const tokens = source("src/app/styles/tokens.css");
assert.match(appLayout, /import "\.\.\/globals\.css";/);
assert.doesNotMatch(appLayout, /dashboard\.css|dashboard-critical\.css|addEventListener\("load"/);
assert.match(appLayout, /FIRST_PAINT_CSS/);
assert.ok(firstPaint.length < 1500, "inline first-paint CSS stays a tiny theme block");
assert.doesNotMatch(firstPaint, /\[data-|#workspace-/);
assert.match(firstPaint, /html\.dark\{background:#141516/);
assert.match(firstPaint, /font-display:swap/);
assert.doesNotMatch(source("next.config.ts"), /inlineCss/);
assert.doesNotMatch(legalLayout, /from "\.\.\/first-paint-css"/);
assert.doesNotMatch(appLayout, /isPublicPolicyPath/);
assert.match(legalLayout, /LEGAL_FIRST_PAINT_CSS/);

// Dark is the default theme: only a stored "light" removes the class.
assert.match(appLayout, /localStorage\.getItem\("postforge-theme"\)/);
assert.match(appLayout, /r\.classList\.toggle\("dark",t!=="light"\)/);
assert.match(source("src/components/theme-toggle.tsx"), /localStorage\.setItem\("postforge-theme", next \? "dark" : "light"\)/);
assert.match(tokens, /\.dark \{[\s\S]*?--pf-floor: #141516;/);
assert.match(tokens, /:root \{[\s\S]*?--pf-floor: #ededeb;/);

// Fonts are self-hosted woff2 with swap; next/font stays out.
assert.match(tokens, /font-family: "Hanken Grotesk";[\s\S]*?font-display: swap;[\s\S]*?\/fonts\/hanken-grotesk-latin-wght-normal\.woff2/);
assert.match(tokens, /font-family: "Geist Mono";[\s\S]*?font-display: swap;/);
assert.match(source("src/app/globals.css"), /--font-sans: "Hanken Grotesk"/);

// Shell landmarks and the responsive contract live in one stylesheet.
assert.match(shell, /<main id="workspace-shell">/);
assert.match(sidebar, /<aside id="workspace-sidebar">/);
assert.match(sidebar, /id="workspace-mobile-bar"/);
assert.match(sidebar, /id="workspace-mobile-drawer"/);
assert.match(shellStyles, /#workspace-shell \{[\s\S]*?min-width: 0;[\s\S]*?overflow-x: clip;/);
assert.match(source("src/app/styles/base.css"), /body \{[\s\S]*?min-width: 320px;/);
assert.match(shellStyles, /\.pf-content-viewport \{[\s\S]*?100dvh/);
assert.match(shellStyles, /--pf-sidebar-w|var\(--pf-sidebar-w\)/);
assert.match(tokens, /--pf-sidebar-w: 248px;/);
assert.match(tokens, /--pf-rail-w: 72px;/);
assert.match(tokens, /--pf-page-pad: 16px;/);
assert.match(shellStyles, /@media \(min-width: 768px\) \{\s*#workspace-mobile-bar \{\s*display: none;/);
assert.match(shellStyles, /@media \(min-width: 768px\) and \(max-width: 1279\.98px\)/);
assert.match(shellStyles, /html\[data-sidebar-collapsed="true"\] #workspace-sidebar \{[\s\S]*?width: var\(--pf-rail-w\);/);
assert.match(shellStyles, /html\[data-sidebar-collapsed="true"\] #workspace-shell \{\s*margin-left: calc\(var\(--pf-rail-w\)/);
assert.match(shellStyles, /html\[data-sidebar-collapsed="true"\] \.workspace-sidebar-offset-left/);
// The collapsed rail keeps the 32px brand tile visible
assert.doesNotMatch(shellStyles, /#workspace-sidebar \.sidebar-brand \{\s*display: none;/);
assert.match(
  shellStyles,
  /html\[data-sidebar-collapsed="true"\] #workspace-sidebar \.sidebar-brand \{\s*flex: 0 0 auto;/
);

// Safe areas: the mobile bar, the drawer and the shell all respect the insets.
assert.match(shellStyles, /#workspace-mobile-bar \{[\s\S]*?env\(safe-area-inset-top\)/);
assert.match(shellStyles, /\.sidebar-mobile-frame \{[\s\S]*?env\(safe-area-inset-top\)[\s\S]*?env\(safe-area-inset-bottom\)/);
assert.match(shellStyles, /#workspace-shell \{[\s\S]*?env\(safe-area-inset-top\)[\s\S]*?env\(safe-area-inset-bottom\)/);
assert.match(source("src/app/styles/legacy.css"), /\.pf-safe-overlay \{[\s\S]*?safe-area-inset-top/);
assert.match(source("src/app/styles/legacy.css"), /\.pf-safe-dialog-viewport \{/);

// The sidebar is server-rendered with the shell, after the page content.
assert.match(appLayout, /from "@\/components\/sidebar";/);
assert.ok(
  appLayout.indexOf("<WorkspaceShell") < appLayout.indexOf("<Sidebar"),
  "workspace heading HTML must precede sidebar SVG so LCP can paint before the nav tree",
);

// Page header text is real text rendered by React, never CSS-generated content.
const headerGate = source("src/components/workspace-header-gate.tsx");
assert.match(headerGate, /<PageHeader id="workspace-header" title=\{activeItem\.label\}>/);
assert.doesNotMatch(headerGate, /sr-only|data-header-copy|data-workspace-title|description/);
assert.doesNotMatch(shellStyles, /content:\s*attr\(/);
assert.doesNotMatch(source("src/components/workspace-state.tsx"), /sr-only|data-workspace-title/);

// No size pins: the stylesheet never forces layout with !important outside reduced motion.
for (const sheetPath of ["shell.css", "workbench.css", "workbench-data.css", "legacy.css", "tokens.css"]) {
  assert.doesNotMatch(source(`src/app/styles/${sheetPath}`), /!important/);
}

// Motion: one easing, three durations, reduced motion honoured.
assert.match(tokens, /--pf-ease: cubic-bezier\(0\.22, 1, 0\.36, 1\);/);
assert.match(tokens, /--pf-dur-feedback: 160ms;[\s\S]*?--pf-dur-state: 200ms;[\s\S]*?--pf-dur-enter: 220ms;/);
assert.match(source("src/app/styles/base.css"), /prefers-reduced-motion: reduce/);
assert.doesNotMatch(source("src/components/ui/skeleton.tsx"), /animate-pulse|shimmer/);

assert.doesNotMatch(source("src/app/first-paint-css.ts"), /@media \(max-width:767\.98px\)\{\[data-gallery-toolbar/);
assert.doesNotMatch(source("src/app/first-paint-css.ts"), /data-empty-stack/);
assert.doesNotMatch(
  source("src/app/first-paint-css.ts"),
  /\.pf-content-viewport header\{display:flex;height:4\.75rem/,
);
assert.match(source("src/components/public-policy-page.tsx"), /data-policy-title=\{title\}/);
assert.match(source("src/components/public-policy-page.tsx"), /data-policy-summary=\{summary\}/);
assert.doesNotMatch(appLayout, /next\/font/);
assert.doesNotMatch(legalLayout, /next\/font/);
assert.match(source("src/app/(legal)/layout.tsx"), /legal\.css/);
assert.doesNotMatch(source("src/app/(legal)/layout.tsx"), /globals\.css|dashboard\.css/);
assert.match(
  source("src/lib/use-window-load-ready.ts"),
  /window\.addEventListener\("load"/,
);
console.log("responsive layout invariant tests passed");
