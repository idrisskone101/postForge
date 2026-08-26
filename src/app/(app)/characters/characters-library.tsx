"use client";

import Link from "next/link";
import { Grid2X2, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CharacterCard } from "./characters-card";
import { GENDER_FILTER_OPTIONS } from "./characters-helpers";
import type { CharactersLibraryModel } from "./types";

export function CharactersLibrary({ library }: { library: CharactersLibraryModel }) {
  const {
    recordCount,
    search,
    gender,
    view,
    onSearchChange,
    onGenderChange,
    onViewChange,
  } = library;

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] text-[var(--pf-muted)]">{recordCount} saved identities</p>
          <h2 className="pf-section-title mt-1">Character library</h2>
        </div>
        <Link href="/characters/new" className="pf-button-primary shrink-0">
          <Plus className="size-3.5" /> New character
        </Link>
      </section>

      <section className="pf-card mt-4 p-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-canvas)] px-3 lg:max-w-sm">
            <Search className="size-3.5 shrink-0 text-[var(--pf-muted)]" />
            <span className="sr-only">Search characters</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--pf-ink)] outline-none placeholder:text-[var(--pf-muted)]"
              placeholder="Search characters"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-canvas)] px-3 text-[12px] text-[var(--pf-ink)]">
              <SlidersHorizontal className="size-3.5 text-[var(--pf-muted)]" />
              <span className="sr-only">Filter by identity</span>
              <select
                value={gender}
                onChange={(event) => onGenderChange(event.target.value)}
                className="bg-transparent outline-none"
              >
                {GENDER_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="flex rounded-[8px] bg-[var(--pf-active)] p-1">
              <button
                type="button"
                onClick={() => onViewChange("grid")}
                className={cn(
                  "grid size-7 place-items-center rounded-[6px]",
                  view === "grid" &&
                    "bg-[var(--pf-surface)] shadow-[var(--pf-shadow-2xs)]"
                )}
                aria-label="Grid view"
              >
                <Grid2X2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewChange("list")}
                className={cn(
                  "grid size-7 place-items-center rounded-[6px]",
                  view === "list" &&
                    "bg-[var(--pf-surface)] shadow-[var(--pf-shadow-2xs)]"
                )}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <CharactersResults library={library} />
    </>
  );
}

function CharactersResults({ library }: { library: CharactersLibraryModel }) {
  const {
    filtered,
    view,
    menu,
    busyId,
    onSelect,
    onMenuToggle,
    onDuplicate,
    onRemove,
    onClearFilters,
  } = library;

  if (filtered.length === 0) {
    return (
      <section className="mt-4 grid min-h-[430px] place-items-center rounded-[8px] border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-surface)] text-center">
        <div>
          <Search className="mx-auto size-8 text-[var(--pf-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--pf-ink)]">
            No matching characters
          </h3>
          <p className="mt-1 text-[12px] text-[var(--pf-muted)]">
            Try a different name or identity filter.
          </p>
          <button type="button" onClick={onClearFilters} className="pf-button-secondary mt-4">
            Clear filters
          </button>
        </div>
      </section>
    );
  }

  if (view === "grid") {
    return (
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((record) => (
          <CharacterCard
            key={record.id}
            card={{
              record,
              view: "grid",
              menuOpen: menu === record.id,
              busy: busyId === record.id,
              onSelect,
              onMenuToggle,
              onDuplicate,
              onRemove,
            }}
          />
        ))}
      </section>
    );
  }

  return (
    <section className="pf-card mt-4 min-w-0 overflow-hidden">
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_140px_36px] gap-3 border-b border-[var(--pf-border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:grid">
        <span className="sr-only">Portrait</span>
        <span>Character</span>
        <span>Status</span>
        <span>Updated</span>
        <span className="sr-only">Actions</span>
      </div>
      <div className="divide-y divide-[var(--pf-border)]">
        {filtered.map((record) => (
          <CharacterCard
            key={record.id}
            card={{
              record,
              view: "list",
              menuOpen: menu === record.id,
              busy: busyId === record.id,
              onSelect,
              onMenuToggle,
              onDuplicate,
              onRemove,
            }}
          />
        ))}
      </div>
    </section>
  );
}
