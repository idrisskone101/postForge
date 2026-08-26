"use client";

import Link from "next/link";
import { UserRound, UserRoundPlus } from "lucide-react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { CharactersPaintText, PAINT_HIDDEN_SHELL } from "./characters-paint-text";

export function CharactersEmpty() {
  const paintReady = useWindowLoadReady();

  return (
    <section
      data-characters-empty="true"
      className="pf-card pf-empty-stage flex min-h-[650px] flex-col items-center justify-start overflow-hidden px-5 text-center"
    >
      <div data-empty-figure="true" className="relative h-32 w-44">
        <div className="absolute left-1/2 top-0 h-28 w-20 -translate-x-1/2 overflow-hidden rounded-lg border-4 border-[var(--pf-surface)] bg-[var(--pf-active)] shadow-[var(--pf-shadow-md)]" />
        <span
          className="absolute bottom-0 right-6 grid size-9 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]"
        >
          <UserRound className="size-4" />
        </span>
      </div>

      <CharactersPaintText
        ready={paintReady}
        liveAs="span"
        liveClassName="mt-4 max-w-md text-balance text-center text-[16px] font-semibold leading-6 text-[var(--pf-ink)] [overflow-wrap:anywhere]"
        paint={
          <h2 data-empty-heading="true" data-empty-title="Create a reusable character">
            <span className="sr-only">Create a reusable character</span>
          </h2>
        }
      >
        Create a reusable character
      </CharactersPaintText>

      <p className="sr-only">
        Save identity, look, and marks once. Reuse that blueprint in later prompts.
      </p>
      <CharactersPaintText
        ready={paintReady}
        liveClassName="mt-2 max-w-md text-[13px] leading-5 text-[var(--pf-muted)] [overflow-wrap:anywhere]"
        paint={
          <p
            aria-hidden="true"
            data-empty-copy="Save identity, look, and marks once. Reuse that blueprint in later prompts."
          />
        }
      >
        Save identity, look, and marks once. Reuse that blueprint in later prompts.
      </CharactersPaintText>

      <Link href="/characters/new" data-empty-actions="true" className="pf-button-primary mt-5">
        <UserRoundPlus className="size-3.5" /> New character
      </Link>

      <div aria-hidden={paintReady || undefined} style={paintReady ? PAINT_HIDDEN_SHELL : undefined}>
        <div
          data-empty-chips="true"
          className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-[var(--pf-muted)]"
        >
          {EMPTY_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2.5 py-1"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      {paintReady ? (
        <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-[var(--pf-muted)]">
          {EMPTY_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-2.5 py-1"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const EMPTY_CHIPS = [
  "36 attribute groups",
  "Prompt + JSON export",
  "Database-backed",
] as const;
