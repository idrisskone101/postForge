"use client";

import Link from "next/link";
import { CharacterPhoto } from "@/components/character-photo";
import { Button, buttonClass, Icon, StatusChip } from "@/components/workbench";
import { buildCharacterPrompt } from "@/lib/character-attributes";
import type { CharacterRecord } from "@/lib/characters";
import { cn } from "@/lib/utils";
import {
  CharacterIdentityPackRow,
  CharacterIdentityPackNotice,
  identityPackNeedsNotice,
} from "./characters-identity-pack";
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
  // The notice takes the prompt bed's place, so the four actions stay in view. Copy prompt still copies it.
  const showPromptBed = !sheet && !identityPackNeedsNotice(identity);

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col gap-4", !sheet && "flex-1")} aria-busy={busy}>
      {/* The actions sit outside this body. A provider error too long for the screen scrolls here, under the fade. */}
      <div className={sheet ? "contents" : BODY_CLASS}>
        <div className={sheet ? "flex min-w-0 items-center gap-3.5" : "contents"}>
          <div
            data-character-stage
            className={cn(
              "grid place-items-center",
              // Beside the notice the stage gives up height, so a long provider error still leaves the actions in view.
              sheet ? "h-28 w-[84px] shrink-0" : cn(STAGE_CLASS, showPromptBed ? "shrink-0" : "min-h-[200px] shrink")
            )}
          >
            <span
              className={cn(
                "block overflow-hidden",
                sheet
                  ? "h-28 w-[84px] rounded-[10px]"
                  : "aspect-[236/308] h-[calc(100%-62px)] max-h-[308px] rounded-sm [&_img]:rounded-sm [@media(max-height:779.98px)]:h-[calc(100%-32px)]"
              )}
            >
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

        <dl className="flex shrink-0 flex-col">
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

        {showPromptBed ? (
          <CharacterPromptBed key={record.id} prompt={buildCharacterPrompt(record.attributes)} />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex gap-2">
          <Link
            href={`/characters/new?id=${encodeURIComponent(record.id)}`}
            className={cn(buttonClass("strong", 40), "min-w-0 flex-1 px-0", sheet && "h-11")}
          >
            <Icon name="pencil" size={16} className="size-4" />
            Edit character
          </Link>
          <Button size={40} className={cn("min-w-0 flex-1 px-0", sheet && "h-11")} onClick={() => onCopyPrompt(record)}>
            <Icon name="copy" size={16} className="size-4" />
            Copy prompt
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size={32} className={cn("min-w-0 flex-1", sheet && "h-11 text-sm")} disabled={busy} onClick={() => onDuplicate(record)}>
            Duplicate
          </Button>
          <Button
            variant="danger"
            size={32}
            className={cn("min-w-0 flex-1", sheet && "h-11 text-sm")}
            disabled={busy}
            onClick={() => onRequestDelete(record)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/*
 * The stage is the design's 370px wherever the prompt bed keeps a line beside it (from 900px tall).
 * On a shorter screen it steps down, so the bed and both action rows stay in view without a scroll.
 */
const BODY_CLASS =
  "wb-scroll-fade-y wb-scroll-fade-deep wb-ring-room flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto";

const STAGE_CLASS =
  "h-[370px] rounded-lg bg-floor [@media(min-height:780px)_and_(max-height:899.98px)]:h-[260px] [@media(max-height:779.98px)]:h-[200px]";

function detailRows(record: CharacterRecord) {
  return [
    ["Gender", record.attributes.gender],
    ["Age", record.attributes.age],
    ["Aesthetic", record.attributes.aesthetic],
    ["Hair", record.attributes.hairStyle],
  ] as const;
}
