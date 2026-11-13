"use client";

import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { cn } from "@/lib/utils";

export function CharacterCategoryRail({
  attributes,
  activeSection,
  onSelectSection,
}: {
  attributes: CharacterAttributes;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}) {
  return (
    <nav
      aria-label="Character attribute recipe"
      data-character-rail
      className="-mx-1 overflow-x-auto px-1 py-0.5 xl:mx-0 xl:w-[272px] xl:shrink-0 xl:overflow-y-auto xl:rounded-xl xl:bg-panel xl:p-5 xl:shadow-panel"
    >
      <ol className="flex gap-1 sm:gap-2 xl:h-full xl:flex-col xl:gap-0">
        {CHARACTER_ATTRIBUTE_SECTIONS.map((section, index) => {
          const current = section.id === activeSection;
          const filled = section.groups.filter((group) => Boolean(attributes[group.key]?.trim())).length;
          const last = index === CHARACTER_ATTRIBUTE_SECTIONS.length - 1;
          return (
            <li
              key={section.id}
              className={cn(
                "relative flex min-w-0 flex-1 sm:flex-none sm:shrink-0",
                !last && "xl:max-h-[68px] xl:min-h-10 xl:flex-1",
              )}
            >
              {last ? null : (
                <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 hidden w-0.5 bg-hairline xl:block" />
              )}
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                aria-current={current ? "step" : undefined}
                aria-label={`${index + 1}. ${section.label}`}
                title={section.label}
                className={cn(
                  "group flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full text-left outline-none transition-[background-color,box-shadow] duration-[160ms] ease-pf focus-visible:shadow-[inset_0_0_0_2px_var(--pf-ember)] sm:w-auto sm:justify-start sm:bg-panel sm:px-1.5 xl:h-7 xl:w-full xl:gap-3 xl:bg-transparent xl:p-0 xl:focus-visible:shadow-none",
                  current && "sm:pr-3.5 sm:shadow-[inset_0_0_0_2px_var(--pf-ember)] xl:pr-0 xl:shadow-none"
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs leading-4 transition-[box-shadow] duration-[160ms] ease-pf group-focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]",
                    current
                      ? "font-bold text-ember-text shadow-[inset_0_0_0_2px_var(--pf-ember)]"
                      : "font-semibold text-fg-muted shadow-[inset_0_0_0_1.5px_var(--pf-hairline)]"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "hidden flex-1 whitespace-nowrap text-sm leading-[18px] transition-colors duration-[160ms] ease-pf xl:block",
                    current
                      ? "font-bold text-fg sm:block"
                      : "font-medium text-fg-muted group-hover:text-fg-secondary"
                  )}
                >
                  {section.label}
                </span>
                {current ? (
                  <span className="hidden h-[22px] items-center rounded-full bg-ember-wash px-2 text-xs font-semibold leading-4 text-ember-text xl:inline-flex">
                    {filled} / {section.groups.length}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
