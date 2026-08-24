"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Grid2X2,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRoundPlus,
  X,
} from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import { buildCharacterPrompt } from "@/lib/character-attributes";
import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

export function CharactersPageClient({
  initialRecords,
}: {
  initialRecords: CharacterRecord[];
}) {
  const [records, setRecords] = useState<CharacterRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("All identities");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<CharacterRecord | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<CharacterRecord>("characters")
      .then(({ records: next }) => {
        if (!cancelled) setRecords(next.filter(isCharacterRecord));
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load characters"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => records.filter((record) => {
    const matchesSearch = `${record.name} ${record.attributes.ethnicity} ${record.attributes.aesthetic}`.toLowerCase().includes(search.toLowerCase());
    const matchesGender = gender === "All identities" || record.attributes.gender === gender;
    return matchesSearch && matchesGender;
  }), [records, search, gender]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }

  async function remove(record: CharacterRecord) {
    const deletionDetail = record.avatarId
      ? "Its reusable avatar will also be removed. Existing generated outputs stay available."
      : "Existing generated outputs stay available.";
    if (!window.confirm(`Delete ${record.name}? ${deletionDetail}`)) return;
    setBusyId(record.id);
    let linkedAvatarRemoved = false;
    try {
      const avatarIsShared = Boolean(
        record.avatarId &&
          records.some(
            (candidate) =>
              candidate.id !== record.id && candidate.avatarId === record.avatarId
          )
      );
      if (record.avatarId && !avatarIsShared) {
        const response = await fetch(
          `/api/avatars/${encodeURIComponent(record.avatarId)}`,
          { method: "DELETE" }
        );
        if (!response.ok && response.status !== 404) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "The linked reusable avatar could not be deleted.");
        }
        linkedAvatarRemoved = true;
      }
      const { records: next } = await removeWorkspaceFeature<CharacterRecord>("characters", record.id);
      setRecords(next.filter(isCharacterRecord));
      setSelected(null);
      notify("Character deleted");
    } catch (cause) {
      if (linkedAvatarRemoved) {
        try {
          const recovered: CharacterRecord = {
            ...record,
            avatarId: null,
            previewKind: undefined,
            previewFingerprint: null,
            updatedAt: new Date().toISOString(),
          };
          const { records: next } = await saveWorkspaceFeature(
            "characters",
            recovered
          );
          setRecords(next.filter(isCharacterRecord));
          setSelected(recovered);
        } catch {
          // The original error remains the actionable failure. A reload will
          // reconcile the server-owned records before another action.
        }
      }
      setError(
        cause instanceof Error ? cause.message : "Unable to delete character"
      );
    } finally {
      setBusyId(null);
      setMenu(null);
    }
  }

  async function duplicate(record: CharacterRecord) {
    setBusyId(record.id);
    const now = new Date().toISOString();
    const copy: CharacterRecord = {
      ...record,
      id: `character_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${record.name} copy`,
      previewSeed: record.previewSeed + 1,
      avatarId: null,
      previewKind: undefined,
      previewFingerprint: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const { records: next } = await saveWorkspaceFeature("characters", copy);
      setRecords(next.filter(isCharacterRecord));
      notify("Draft duplicated — open it and save to make the identity reusable");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to duplicate character");
    } finally {
      setBusyId(null);
      setMenu(null);
    }
  }

  async function copyPrompt(record: CharacterRecord) {
    await navigator.clipboard.writeText(buildCharacterPrompt(record.attributes));
    notify("Character prompt copied");
  }

  if (loading && records.length > 0) {
    return <div className="grid min-h-[520px] place-items-center"><div className="text-center"><Loader2 className="mx-auto size-6 animate-spin text-[var(--pf-orange)]" /><p className="mt-3 text-[12px] text-muted-foreground">Loading identity library…</p></div></div>;
  }

  return (
    <div data-page-inset="true" className="px-5 py-5 sm:px-7 lg:px-8">
      {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error"><X className="size-3.5" /></button></div>}
      {records.length === 0 ? (
        <section
          data-characters-empty="true"
          className="pf-card pf-empty-stage flex min-h-[650px] flex-col items-center justify-center overflow-hidden px-5 text-center"
        >
          <div className="relative h-32 w-44">
            <div className="absolute left-1/2 top-0 h-28 w-20 -translate-x-1/2 overflow-hidden rounded-lg border-4 border-white bg-[var(--pf-active)] shadow-lg" />
            <span className="absolute bottom-0 right-6 grid size-9 place-items-center rounded-full bg-[var(--pf-orange)] text-white shadow-lg"><Plus className="size-4" /></span>
          </div>

          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Create a reusable character</h2>
          <p className="sr-only">Save identity, look, and marks once. Reuse that blueprint in later prompts.</p>
          <p aria-hidden="true" data-empty-copy="Save identity, look, and marks once. Reuse that blueprint in later prompts." />
          <Link href="/characters/new" className="pf-button-primary mt-5"><UserRoundPlus className="size-3.5" /> New character</Link>
          <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground"><span className="rounded-full bg-[var(--pf-active)] px-2.5 py-1">36 attribute groups</span><span className="rounded-full bg-[var(--pf-active)] px-2.5 py-1">Prompt + JSON export</span><span className="rounded-full bg-[var(--pf-active)] px-2.5 py-1">Database-backed</span></div>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[12px] text-muted-foreground">{records.length} saved identities</p><h2 className="pf-section-title mt-1">Character library</h2></div>
            <div className="flex flex-wrap gap-2">
              <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3 lg:flex-none"><Search className="size-3.5 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" placeholder="Search characters" /></label>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-[12px]"><SlidersHorizontal className="size-3.5 text-muted-foreground" /><select value={gender} onChange={(event) => setGender(event.target.value)} className="bg-transparent outline-none"><option>All identities</option><option>Female</option><option>Male</option><option>Non-binary</option></select></label>
              <div className="flex rounded-lg bg-[var(--pf-active)] p-1"><button onClick={() => setView("grid")} className={cn("grid size-7 place-items-center rounded-[6px]",view === "grid" && "bg-white shadow-sm")} aria-label="Grid view"><Grid2X2 className="size-3.5" /></button><button onClick={() => setView("list")} className={cn("grid size-7 place-items-center rounded-[6px]",view === "list" && "bg-white shadow-sm")} aria-label="List view"><List className="size-3.5" /></button></div>
            </div>
          </section>
          {filtered.length === 0 ? <section className="mt-4 grid min-h-[430px] place-items-center rounded-lg border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-surface)] text-center"><div><Search className="mx-auto size-8 text-muted-foreground" /><h3 className="mt-3 text-sm font-semibold">No matching characters</h3><p className="mt-1 text-[12px] text-muted-foreground">Try a different name or identity filter.</p><button onClick={() => { setSearch(""); setGender("All identities"); }} className="pf-button-secondary mt-4">Clear filters</button></div></section> : <section className={cn("mt-4",view === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-2")}>{filtered.map((record) => { const photoReady = Boolean(record.avatarId && record.previewKind === "photographic"); return <article key={record.id} className={cn("pf-card group relative overflow-hidden",view === "list" && "grid grid-cols-[74px_minmax(0,1fr)_auto] items-center p-2")}>
            <button onClick={() => setSelected(record)} className={cn("block w-full text-left",view === "grid" ? "" : "contents")}>
              <div className={cn("overflow-hidden bg-[var(--pf-active)]",view === "grid" ? "aspect-[4/3]" : "h-16 w-14 rounded-lg")}><CharacterPhoto avatarId={photoReady ? record.avatarId : null} alt={`${record.name} portrait`} /></div>
              <div className={cn("min-w-0",view === "grid" ? "p-3" : "px-3")}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-[13px] font-semibold">{record.name}</h3><p className="mt-1 truncate text-[11px] text-muted-foreground">{record.attributes.gender} · {record.attributes.age} · {record.attributes.ethnicity}</p></div>{view === "grid" && (photoReady ? <span className="pf-status-success shrink-0 px-2 py-1 text-[11px] font-bold">READY</span> : <span className="shrink-0 rounded-full bg-[var(--pf-active)] px-2 py-1 text-[11px] font-bold text-muted-foreground">DRAFT</span>)}</div>{view === "grid" && <div className="mt-3 flex min-w-0 flex-wrap gap-1.5"><span className="max-w-full truncate rounded-full bg-[var(--pf-active)] px-2 py-1 text-[11px]">{record.attributes.hairStyle}</span><span className="max-w-full truncate rounded-full bg-[var(--pf-active)] px-2 py-1 text-[11px]">{record.attributes.aesthetic}</span></div>}</div>
            </button>
            <div className={cn("relative",view === "grid" ? "absolute right-2 top-2" : "mr-2")}><button onClick={() => setMenu(menu === record.id ? null : record.id)} className="grid size-8 place-items-center rounded-full border border-white/70 bg-card/90 shadow-sm" aria-label={`Actions for ${record.name}`}><MoreHorizontal className="size-4" /></button>{menu === record.id && <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-border bg-white p-1.5 text-[12px] shadow-xl"><Link href={`/characters/new?id=${encodeURIComponent(record.id)}`} className="flex h-8 items-center gap-2 rounded-[6px] px-2 hover:bg-[var(--pf-active)]"><Pencil className="size-3" /> Edit</Link><button onClick={() => duplicate(record)} className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 hover:bg-[var(--pf-active)]"><Copy className="size-3" /> Duplicate</button><button onClick={() => remove(record)} className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10"><Trash2 className="size-3" /> Delete</button></div>}</div>
            {busyId === record.id && <div className="absolute inset-0 grid place-items-center bg-card/80"><Loader2 className="size-5 animate-spin text-[var(--pf-orange)]" /></div>}
          </article>; })}</section>}
        </>
      )}

      {selected && <div className="pf-safe-overlay fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="character-detail-title" onClick={() => setSelected(null)}><div className="grid max-h-full w-full max-w-[780px] overflow-y-auto rounded-[12px] bg-white shadow-2xl md:grid-cols-[310px_1fr]" onClick={(event) => event.stopPropagation()}><div className="min-h-[380px] bg-[var(--pf-active)]"><CharacterPhoto avatarId={selected.avatarId && selected.previewKind === "photographic" ? selected.avatarId : null} alt={`${selected.name} portrait`} className="min-h-[380px] md:h-full" /></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[12px] text-muted-foreground">{selected.avatarId && selected.previewKind === "photographic" ? "Saved identity" : "Draft character"}</p><h2 id="character-detail-title" className="mt-1 break-words text-xl font-semibold tracking-[-0.035em]">{selected.name}</h2><p className="mt-1 text-[12px] text-muted-foreground">Updated {new Date(selected.updatedAt).toLocaleDateString()}</p></div><button onClick={() => setSelected(null)} className="grid size-8 shrink-0 place-items-center rounded-full border border-border"><X className="size-3.5" /></button></div><div className="mt-5 grid grid-cols-2 gap-2">{Object.entries(selected.attributes).slice(0, 12).map(([key, value]) => <div key={key} className="min-w-0 rounded-lg bg-[var(--pf-canvas)] p-2"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span><b className="mt-1 block truncate text-[11px]">{value}</b></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><Link href={`/characters/new?id=${encodeURIComponent(selected.id)}`} className="pf-button-primary"><Pencil className="size-3.5" /> Edit character</Link><button onClick={() => copyPrompt(selected)} className="pf-button-secondary"><Copy className="size-3.5" /> Copy prompt</button><button onClick={() => remove(selected)} className="pf-button-secondary text-[var(--pf-danger)]"><Trash2 className="size-3.5" /> Delete</button></div></div></div></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}
