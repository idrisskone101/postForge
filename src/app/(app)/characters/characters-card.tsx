"use client";

import Link from "next/link";
import { Copy, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import type { CharacterRecord } from "@/lib/characters";
import { formatShortDate, photoReady } from "./characters-helpers";
import type { CharacterCardModel } from "./types";

export function CharacterCard({ card }: { card: CharacterCardModel }) {
  const {
    record,
    view,
    menuOpen,
    busy,
    onSelect,
    onMenuToggle,
    onDuplicate,
    onRemove,
  } = card;
  const ready = photoReady(record);

  if (view === "list") {
    return (
      <article className="group relative min-w-0">
        <button
          type="button"
          onClick={() => onSelect(record)}
          className="grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors duration-[180ms] hover:bg-[var(--pf-active)] md:grid-cols-[56px_minmax(0,1fr)_120px_140px_36px]"
        >
          <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] md:size-14">
            <CharacterPhoto
              avatarId={ready ? record.avatarId : null}
              alt={`${record.name} portrait`}
              className="size-full"
            />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">
              {record.name}
            </strong>
            <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-muted)]">
              {record.attributes.gender} · {record.attributes.age} · {record.attributes.ethnicity}
            </span>
            <span className="pf-data mt-0.5 block truncate text-[11px] text-[var(--pf-muted)] md:hidden">
              {record.attributes.hairStyle} · updated {formatShortDate(record.updatedAt)}
            </span>
          </span>
          <span className="hidden md:flex md:items-center">
            {ready ? (
              <span className="pf-status-success px-2 py-1 text-[11px] font-bold">READY</span>
            ) : (
              <span className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2 py-1 text-[11px] font-bold text-[var(--pf-muted)]">DRAFT</span>
            )}
          </span>
          <span className="pf-data hidden text-[12px] text-[var(--pf-muted)] md:block">
            {formatShortDate(record.updatedAt)}
          </span>
          <span className="hidden md:block" aria-hidden="true" />
        </button>
        <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2 md:right-4">
          <button
            type="button"
            onClick={() => onMenuToggle(menuOpen ? null : record.id)}
            className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
            aria-label={`Actions for ${record.name}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen ? (
            <CharacterActionsMenu
              record={record}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
            />
          ) : null}
        </div>
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-[var(--pf-surface)]/80">
            <Loader2 className="size-5 animate-spin text-[var(--pf-orange)]" />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className="pf-card pf-card-hover group relative min-w-0 overflow-hidden">
      <button type="button" onClick={() => onSelect(record)} className="block w-full min-w-0 text-left">
        <div className="aspect-square overflow-hidden rounded-t-[8px] bg-[var(--pf-active)]">
          <CharacterPhoto
            avatarId={ready ? record.avatarId : null}
            alt={`${record.name} portrait`}
            className="size-full"
          />
        </div>
        <div className="min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold text-[var(--pf-ink)]">
                {record.name}
              </h3>
              <p className="mt-1 truncate text-[11px] text-[var(--pf-muted)]">
                {record.attributes.gender} · {record.attributes.age} · {record.attributes.ethnicity}
              </p>
            </div>
            {ready ? (
              <span className="pf-status-success shrink-0 px-2 py-1 text-[11px] font-bold">
                READY
              </span>
            ) : (
              <span className="shrink-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2 py-1 text-[11px] font-bold text-[var(--pf-muted)]">DRAFT</span>
            )}
          </div>
          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            <span className="max-w-full truncate rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2 py-1 text-[11px] text-[var(--pf-muted)]">
              {record.attributes.hairStyle}
            </span>
            <span className="max-w-full truncate rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2 py-1 text-[11px] text-[var(--pf-muted)]">
              {record.attributes.aesthetic}
            </span>
          </div>
        </div>
      </button>
      <div className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => onMenuToggle(menuOpen ? null : record.id)}
          className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
          aria-label={`Actions for ${record.name}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen ? (
          <CharacterActionsMenu
            record={record}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
        ) : null}
      </div>
      {busy ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--pf-surface)]/80">
          <Loader2 className="size-5 animate-spin text-[var(--pf-orange)]" />
        </div>
      ) : null}
    </article>
  );
}

function CharacterActionsMenu({
  record,
  onDuplicate,
  onRemove,
}: {
  record: CharacterRecord;
  onDuplicate: (record: CharacterRecord) => void;
  onRemove: (record: CharacterRecord) => void;
}) {
  return (
    <div
      className="absolute right-0 top-9 z-20 w-36 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-1.5 text-[12px] shadow-[var(--pf-shadow-lg)]"
    >
      <Link
        href={`/characters/new?id=${encodeURIComponent(record.id)}`}
        className="flex h-8 items-center gap-2 rounded-[8px] px-2 text-[var(--pf-ink)] hover:bg-[var(--pf-active)]"
      >
        <Pencil className="size-3" /> Edit
      </Link>
      <button
        type="button"
        onClick={() => onDuplicate(record)}
        className="flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-[var(--pf-ink)] hover:bg-[var(--pf-active)]"
      >
        <Copy className="size-3" /> Duplicate
      </button>
      <button
        type="button"
        onClick={() => onRemove(record)}
        className="flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10"
      >
        <Trash2 className="size-3" /> Delete
      </button>
    </div>
  );
}
