"use client";

import { CharacterPhoto } from "@/components/character-photo";
import { Icon, StatusBadge, StatusChip } from "@/components/workbench";
import type { CharacterRecord } from "@/lib/characters";
import { cn } from "@/lib/utils";
import { characterDateMeta, formatShortDate, photoReady } from "./characters-helpers";

export function CharacterTile({
  record,
  selected,
  priority,
  onSelect,
}: {
  record: CharacterRecord;
  selected: boolean;
  priority: boolean;
  onSelect: (record: CharacterRecord) => void;
}) {
  const ready = photoReady(record);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(record)}
      className="wb-tile-cell group cursor-pointer rounded-lg text-left outline-none focus-visible:[&>.wb-tile]:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]"
    >
      <span className="wb-tile aspect-[343/600] max-sm:aspect-[157/200]" data-selected={selected ? "true" : undefined}>
        <CharacterPhoto
          avatarId={ready ? record.avatarId : null}
          alt={`${record.name} portrait`}
          sizes={TILE_SIZES}
          priority={priority}
        />
        {selected ? (
          <span className="wb-tile-check size-6" aria-hidden="true">
            <Icon name="check" size={14} strokeWidth={2.5} className="size-3.5" />
          </span>
        ) : null}
        {ready ? null : <StatusBadge tone="warn" label="Draft" className="wb-tile-badge [&>svg]:size-3.5 [&>svg]:stroke-[1.5]" />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold leading-[18px] text-fg">{record.name}</span>
        <span className="truncate text-[13px] leading-4 text-fg-muted">{characterDateMeta(record)}</span>
      </span>
    </button>
  );
}

export function CharacterRow({
  record,
  selected,
  onSelect,
}: {
  record: CharacterRecord;
  selected: boolean;
  onSelect: (record: CharacterRecord) => void;
}) {
  const ready = photoReady(record);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(record)}
      className={cn(
        "wb-row w-full cursor-pointer rounded-lg text-left transition-[background-color,box-shadow] duration-[160ms] ease-pf hover:bg-raised",
        selected && "bg-raised shadow-[inset_0_0_0_2px_var(--pf-ember)]"
      )}
    >
      <span className="wb-thumb size-10 shrink-0 overflow-hidden">
        <CharacterPhoto
          avatarId={ready ? record.avatarId : null}
          alt={`${record.name} portrait`}
          sizes="40px"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="wb-row-title">{record.name}</span>
        <span className="wb-row-sub">
          {record.attributes.gender}, {record.attributes.age}
        </span>
      </span>
      <span className="hidden w-[180px] shrink-0 truncate text-sm text-fg-secondary md:block">
        {record.attributes.aesthetic}
      </span>
      <span className="flex w-[96px] shrink-0">
        {ready ? <StatusChip tone="ok">Saved</StatusChip> : <StatusChip tone="warn">Draft</StatusChip>}
      </span>
      <span className="wb-mono hidden w-[88px] shrink-0 text-fg-muted sm:block">
        {formatShortDate(record.updatedAt)}
      </span>
    </button>
  );
}

const TILE_SIZES = "(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw";
