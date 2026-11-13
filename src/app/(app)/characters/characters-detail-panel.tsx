"use client";

import Link from "next/link";
import { CharacterPhoto } from "@/components/character-photo";
import { Button, buttonClass, Icon, StatusChip } from "@/components/workbench";
import { buildCharacterPrompt } from "@/lib/character-attributes";
import type { CharacterRecord } from "@/lib/characters";
import { cn } from "@/lib/utils";
import { CharacterIdentityPackRow, CharacterIdentityPackNotice } from "./characters-identity-pack";
import { formatShortDate, photoReady } from "./characters-helpers";
import { CharacterPromptBed } from "./characters-prompt-bed";
import type { CharacterInspectorModel } from "./types";
import { useIdentityPack } from "./use-identity-pack";

export function CharacterDetailPanel({
  inspector,
  variant = "panel",
}: {
  inspector: CharacterInspectorModel;
  variant?: "panel" | "sheet";
}) {
  const { record, busy, onCopyPrompt, onDuplicate, onRequestDelete } = inspector;
  const ready = photoReady(record);
  const identity = useIdentityPack(ready ? record.avatarId ?? null : null);
  const sheet = variant === "sheet";

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", sheet ? "min-h-0" : "flex-[1_0_auto]")} aria-busy={busy}>
      <div className={cn("flex min-w-0 gap-3.5", sheet ? "items-center" : "shrink-0 flex-col gap-4")}>
        <div
          className={cn(
            "grid shrink-0 place-items-center",
            sheet ? "h-28 w-[84px]" : "h-[370px] rounded-lg bg-floor max-xl:h-[320px]"
          )}
        >
          <span className={cn("block overflow-hidden", sheet ? "h-28 w-[84px] rounded-[10px]" : "h-[308px] w-[236px] rounded-sm [&_img]:rounded-sm")}>
            <CharacterPhoto
              avatarId={ready ? record.avatarId : null}
              alt={`${record.name} portrait`}
              sizes={sheet ? "84px" : "236px"}
            />
          </span>
        </div>
        <div className={cn("flex min-w-0 items-start justify-between gap-3", sheet ? "flex-1 flex-col gap-1.5 pr-10" : "shrink-0")}>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={`character-detail-title-${variant}`} className="text-xl font-bold leading-6 tracking-[-0.01em] text-fg [overflow-wrap:anywhere]">
              {record.name}
            </h2>
            <p className="text-[13px] leading-4 text-fg-muted">Updated {formatShortDate(record.updatedAt)}</p>
          </div>
          {ready ? <StatusChip tone="ok">Saved</StatusChip> : <StatusChip tone="warn">Draft</StatusChip>}
        </div>
      </div>

      <dl className="flex flex-col">
        {detailRows(record).map(([label, value]) => (
          <div key={label} className="flex h-[34px] shrink-0 items-center justify-between gap-3 border-t border-hairline">
            <dt className="text-xs font-semibold leading-4 text-fg-muted">{label}</dt>
            <dd className="truncate text-sm font-medium leading-[18px] text-fg">{value}</dd>
          </div>
        ))}
        {ready ? <CharacterIdentityPackRow identity={identity} /> : null}
        <div className="border-t border-hairline" />
      </dl>

      <CharacterIdentityPackNotice identity={identity} />

      {sheet ? null : (
        <CharacterPromptBed key={record.id} prompt={buildCharacterPrompt(record.attributes)} />
      )}

      <div className={cn("flex shrink-0 flex-col gap-2", !sheet && "sticky -bottom-5 z-10 -mt-2 -mb-5 bg-panel pt-2 pb-5")}>
        <div className="flex gap-2">
          <Link
            href={`/characters/new?id=${encodeURIComponent(record.id)}`}
            className={cn(buttonClass("strong", 40), "flex-1 px-0", sheet && "h-11")}
          >
            <Icon name="pencil" size={16} className="size-4" />
            Edit character
          </Link>
          <Button size={40} className={cn("flex-1 px-0", sheet && "h-11")} onClick={() => onCopyPrompt(record)}>
            <Icon name="copy" size={16} className="size-4" />
            Copy prompt
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size={32} className={cn("flex-1", sheet && "h-11")} disabled={busy} onClick={() => onDuplicate(record)}>
            Duplicate
          </Button>
          <Button variant="danger" size={32} className={cn("flex-1", sheet && "h-11")} disabled={busy} onClick={() => onRequestDelete(record)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function detailRows(record: CharacterRecord) {
  return [
    ["Gender", record.attributes.gender],
    ["Age", record.attributes.age],
    ["Aesthetic", record.attributes.aesthetic],
    ["Hair", record.attributes.hairStyle],
  ] as const;
}
