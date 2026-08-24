import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
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
        <div className="min-h-dvh">
          <Sidebar />
          <WorkspaceShell>{children}</WorkspaceShell>
        </div>
      </body>
    </html>
  );
}


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
  preload: false,
});

export const metadata: Metadata = {
  title: "PostForge",
  description: "Self-hosted AI content generation platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};