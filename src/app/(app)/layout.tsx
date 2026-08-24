import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar-lazy";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <div id="workspace-root">
      <script
        dangerouslySetInnerHTML={{
          __html: `requestAnimationFrame(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="/dashboard.css";l.media="print";l.onload=function(){l.media="all"};document.head.appendChild(l)})`,
        }}
      />
      <noscript>
        <link rel="stylesheet" href="/dashboard.css" />
      </noscript>
      <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
      <Sidebar />
    </div>
  );
}
