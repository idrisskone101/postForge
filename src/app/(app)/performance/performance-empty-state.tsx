"use client";

import Link from "next/link";
import { BarChart3, Download, Loader2, Upload } from "lucide-react";

export function PerformanceEmptyState({
  importing,
  onImport,
  onDownloadTemplate,
  providerUnavailable,
}: {
  importing: boolean;
  onImport: () => void;
  onDownloadTemplate: () => void;
  providerUnavailable: boolean;
}) {
  return (
    <section data-workspace-state="empty" className="pf-card pf-empty-stage flex min-h-[570px] flex-col items-center justify-center p-6 text-center">
      <div className="grid size-14 place-items-center rounded-[8px] bg-foreground text-background"><BarChart3 className="size-6" /></div>

      <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Connect an account or import a local report</h2>
      <p className="mt-2 max-w-[500px] text-[12px] leading-5 text-muted-foreground">PostForge never invents performance data. Connected accounts use provider-owned posts; CSV remains a separate local dataset.</p>
      {providerUnavailable && <p className="mt-3 text-[11px] font-medium text-[var(--pf-danger)]">Connected account status is currently unavailable. CSV import still works locally.</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/settings?tab=integrations" className="pf-button-primary">Open integrations</Link><button type="button" onClick={onImport} disabled={importing} className="pf-button-secondary">{importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Import CSV</button></div>
      <button type="button" onClick={onDownloadTemplate} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--pf-link)]"><Download className="size-3" /> Download CSV template</button>
      <div className="mt-7 max-w-full rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 px-4 py-3 text-left text-[11px] text-[var(--pf-muted)]"><b className="text-[var(--pf-ink)]">Expected columns</b><p className="mt-1 break-words font-mono [overflow-wrap:anywhere]">title, views, likes, comments, shares, saves, publishedAt</p></div>
    </section>
  );
}
