import { WorkspaceHeaderGate } from "@/components/workspace-header-gate";

export function WorkspaceShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <main
      id="workspace-shell"
      className="min-h-dvh min-w-0 overflow-x-hidden bg-[var(--pf-canvas)] pt-[calc(58px+env(safe-area-inset-top))] md:ml-[72px] md:pt-0 xl:ml-64"
    >
      <WorkspaceHeaderGate serverPathname={pathname} />
      {children}
    </main>
  );
}

export { WorkspaceRouteHeader } from "@/components/workspace-header-gate";
