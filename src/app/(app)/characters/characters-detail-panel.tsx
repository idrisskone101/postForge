"use client";

import Link from "next/link";
import { Copy, Pencil, Trash2, X } from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import type { CharacterRecord } from "@/lib/characters";
import { formatShortDate, photoReady } from "./characters-helpers";

export function CharacterDetailPanel({
  record,
  onClose,
  onCopyPrompt,
  onRemove,
}: {
  record: CharacterRecord;
  onClose: () => void;
  onCopyPrompt: (record: CharacterRecord) => void;
  onRemove: (record: CharacterRecord) => void;
}) {
  const ready = photoReady(record);

  return (
    <div className="grid w-full max-w-[780px] rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-lg)] md:grid-cols-[310px_1fr]">
      <div className="min-h-[380px] bg-[#09090B]">
        <CharacterPhoto
          avatarId={ready ? record.avatarId : null}
          alt={`${record.name} portrait`}
          className="min-h-[380px] md:h-full"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] text-[var(--pf-muted)]">
              {ready ? "Saved identity" : "Draft character"}
            </p>
            <h2
              id="character-detail-title"
              className="mt-1 break-words text-xl font-semibold tracking-[-0.035em] text-[var(--pf-ink)]"
            >
              {record.name}
            </h2>
            <p className="pf-data mt-1 text-[12px] text-[var(--pf-muted)]">
              Updated {formatShortDate(record.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-[var(--pf-border)] text-[var(--pf-muted)] hover:bg-[var(--pf-active)]"
            aria-label="Close detail"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Object.entries(record.attributes).slice(0, 12).map(([key, value]) => (
            <div
              key={key}
              className="min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-canvas)] p-2"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <b className="mt-1 block truncate text-[11px] text-[var(--pf-ink)]">{value}</b>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/characters/new?id=${encodeURIComponent(record.id)}`}
            className="pf-button-primary"
          >
            <Pencil className="size-3.5" /> Edit character
          </Link>
          <button type="button" onClick={() => onCopyPrompt(record)} className="pf-button-secondary">
            <Copy className="size-3.5" /> Copy prompt
          </button>
          <button
            type="button"
            onClick={() => onRemove(record)}
            className="pf-button-secondary text-[var(--pf-danger)]"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
