import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar-lazy";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FIRST_PAINT_CSS } from "../first-paint-css";

const DASHBOARD_CSS_LOADER = `(function(){function load(){if(document.getElementById("pf-dashboard-css"))return;var l=document.createElement("link");l.id="pf-dashboard-css";l.rel="stylesheet";l.href="/dashboard.css";document.head.appendChild(l)}if(document.readyState==="complete")setTimeout(load,0);else window.addEventListener("load",function(){setTimeout(load,0)})})()`;

const DASHBOARD_CSS_ON_INPUT = `(function(){function load(){if(document.getElementById("pf-dashboard-css"))return;var l=document.createElement("link");l.id="pf-dashboard-css";l.rel="stylesheet";l.href="/dashboard.css";document.head.appendChild(l)}function onInput(){load();window.removeEventListener("pointerdown",onInput);window.removeEventListener("keydown",onInput)}window.addEventListener("pointerdown",onInput);window.addEventListener("keydown",onInput)})()`;

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";
  const deferDashboardCss = pathname.startsWith("/characters/new");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{FIRST_PAINT_CSS}</style>
        {deferDashboardCss ? (
          <link
            rel="preload"
            as="image"
            href="/character-builder/default-portrait.webp"
            fetchPriority="high"
          />
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement,t=localStorage.getItem("postforge-theme"),s=localStorage.getItem("postforge-sidebar-collapsed");r.classList.toggle("dark",t==="dark");if(s==="true")r.dataset.sidebarCollapsed="true";else delete r.dataset.sidebarCollapsed}catch(e){document.documentElement.classList.remove("dark");delete document.documentElement.dataset.sidebarCollapsed}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <div
          id="pf-direction-contract"
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: PostForge is a calm professional instrument: the category-standard SaaS dashboard executed at Linear and Resend craft level, where restraint is the identity and the operator's media, pipeline state, and spend carry all the color. Refuses ornamental metaphor skins; clarity is the brand.
OWN-WORLD: token-driven zinc-neutral light + dark themes; hairline-bordered cards with quiet elevation and 6-8px radii; Geist carries UI type, Geist Mono is the data voice for counts, costs, and dates; one coral #FF4A20 accent reserved for primary actions and active states.
STORY: the operator opens the app, scans what is running, reviews finished media, approves publishing, and checks spend; nothing competes for attention.
FIRST VIEWPORT: the existing left sidebar with its expand/collapse behavior; home is a quiet header, a compact stat strip, then the review queue and recent media.
FORM: canon — category standard played straight, user-chosen from direction roll c509faa7; craft bar Linear + Resend.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        <div id="workspace-root">
          <script
            dangerouslySetInnerHTML={{
              __html: deferDashboardCss
                ? DASHBOARD_CSS_ON_INPUT
                : DASHBOARD_CSS_LOADER,
            }}
          />
          <noscript>
            <link rel="stylesheet" href="/dashboard.css" />
          </noscript>
          <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
          <Sidebar />
        </div>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "PostForge",
  description: "Self-hosted AI content generation platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
