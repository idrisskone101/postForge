import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import "../dashboard-critical.css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <div id="workspace-root">
      <style>{`*,*::before,*::after{box-sizing:border-box}#workspace-root{min-height:100dvh;background:#fafafa;color:#18181b}#workspace-sidebar{display:none}#workspace-mobile-bar{position:fixed;inset:0 0 auto 0;z-index:50;display:flex;align-items:center;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) .75rem 0;border-bottom:1px solid #e4e4e7;background:#fff}#workspace-shell{min-height:100dvh;min-width:0;overflow-x:hidden;background:#fafafa;color:#18181b;padding-top:calc(58px + env(safe-area-inset-top))}#workspace-header-grid{display:grid;min-height:120px;gap:1rem;padding:1.5rem 1.25rem}#workspace-header-grid h1{margin:0;height:31px;overflow:hidden;font-size:28px;font-weight:600;line-height:1.1;letter-spacing:-.02em;color:#18181b}.pf-content-viewport header h1{margin:0;font-size:28px;font-weight:600;line-height:1.1;letter-spacing:-.02em;color:#18181b}[data-spend-page="true"]{padding:1.25rem;box-sizing:border-box}[data-generate-model-grid="true"]>button{height:8.125rem;overflow:hidden;background:#fff;color:#18181b}[data-automation-fields="true"]{min-height:29.625rem}[data-automation-preview="true"]{display:none}[data-slideshow-create="true"] textarea{height:5.125rem;box-sizing:border-box}[data-spend-chart-slot="true"]{height:276px}[data-jobs-summary="true"]{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;min-height:10.75rem}[data-jobs-empty="true"]{min-height:18.75rem}[data-characters-empty="true"]{height:650px;overflow:hidden}[data-workspace-state="empty"]{min-height:20rem}@media (max-width:767.98px){[data-gallery-toolbar="true"]{height:15.375rem;overflow:hidden}}@media (min-width:768px){#workspace-mobile-bar{display:none}#workspace-sidebar{display:flex;position:fixed;inset:0 auto 0 0;z-index:40;width:72px;border-right:1px solid #e4e4e7;background:#fff}#workspace-shell{margin-left:72px;padding-top:0}}@media (min-width:1024px){[data-automation-preview="true"]{display:flex;flex-direction:column}}@media (min-width:1280px){#workspace-sidebar{width:16rem}#workspace-shell{margin-left:16rem}html[data-sidebar-collapsed="true"] #workspace-sidebar{width:72px}html[data-sidebar-collapsed="true"] #workspace-shell{margin-left:72px}}`}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `requestAnimationFrame(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="/dashboard.css";document.head.appendChild(l)})`,
        }}
      />
      <noscript>
        <link rel="stylesheet" href="/dashboard.css" />
      </noscript>
      <Sidebar />
      <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
    </div>
  );
}
