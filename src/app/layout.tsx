import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "PostForge",
  description: "Self-hosted AI content generation platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement,t=localStorage.getItem("postforge-theme"),s=localStorage.getItem("postforge-sidebar-collapsed");r.classList.toggle("dark",t==="dark");if(s==="true")r.dataset.sidebarCollapsed="true";else delete r.dataset.sidebarCollapsed}catch(e){document.documentElement.classList.remove("dark");delete document.documentElement.dataset.sidebarCollapsed}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <div className="min-h-dvh">
            <Sidebar />
            <WorkspaceShell>{children}</WorkspaceShell>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
