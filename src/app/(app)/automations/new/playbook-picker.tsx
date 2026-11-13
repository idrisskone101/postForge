import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import { cn } from "@/lib/utils";
import { PlaybookCard } from "./playbook-card";
import { isTemplateSort, type PlaybookPickerView, type TemplateView } from "./playbook-model";
import { PlaybookPreview } from "./playbook-preview";
import {
  bindPlaybookHandler,
  playbookFieldProps,
  playbookSegmentCountClass,
} from "./playbook-visual";

export function PlaybookPicker({ picker }: { picker: PlaybookPickerView }) {
  const { templates, view } = picker;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlaybookToolbar picker={picker} />
      <div
        data-playbook-body="true"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-5 lg:flex-row lg:overflow-hidden"
      >
        <PlaybookPreview template={picker.previewTemplate} />
        <div className="min-w-0 lg:flex-1 lg:overflow-y-auto">
          {templates.length === 0 ? (
            <EmptyState icon="search" title="No matching playbooks" className="min-h-[330px]">
              <Button variant="strong" onClick={clearFiltersHandler(picker)}>
                Clear filters
              </Button>
            </EmptyState>
          ) : (
            <div
              data-playbook-cards="true"
              className={cn(
                "grid gap-3",
                view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
              )}
            >
              {templates.map((template) => (
                <PlaybookCard key={template.id} picker={picker} template={template} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const VIEWS: { value: TemplateView; label: string; icon: "grid" | "list" }[] = [
  { value: "grid", label: "Grid view", icon: "grid" },
  { value: "list", label: "List view", icon: "list" },
];

function PlaybookToolbar({ picker }: { picker: PlaybookPickerView }) {
  const { categories, categoryCounts, category, search, sort, view } = picker;
  return (
    <div className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="wb-input-wrap basis-full sm:basis-0 sm:flex-1" data-size="36">
          <Icon name="search" size={15} />
          <input
            data-playbook-key="search"
            placeholder="Search playbooks"
            aria-label="Search playbooks"
            {...playbookFieldProps(search, picker.onSearchChange)}
          />
          {search && picker.onSearchChange ? (
            <IconButton
              icon="x"
              label="Clear playbook search"
              variant="ghost"
              size={28}
              className="-mr-2"
              onClick={bindPlaybookHandler(picker.onSearchChange, "")}
            />
          ) : null}
        </label>
        <select
          className="wb-input min-w-0 flex-1 sm:w-[168px] sm:flex-none"
          data-size="36"
          data-playbook-key="sort"
          aria-label="Sort playbooks"
          {...playbookFieldProps(sort, sortHandler(picker))}
        >
          <option value="recommended">Recommended</option>
          <option value="name">Name</option>
          <option value="slides">Slides</option>
        </select>
        <div role="group" aria-label="Playbook view" className="wb-segmented">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="wb-segment"
              data-icon="true"
              data-playbook-key={`view:${option.value}`}
              aria-label={option.label}
              aria-pressed={view === option.value}
              onClick={bindPlaybookHandler(picker.onViewChange, option.value)}
            >
              <Icon name={option.icon} size={14} />
            </button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Playbook categories" className="wb-segmented self-start">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className="wb-segment"
            data-playbook-key={`category:${item}`}
            aria-pressed={category === item}
            onClick={bindPlaybookHandler(picker.onCategoryChange, item)}
          >
            {item}
            <span className={playbookSegmentCountClass(category === item)}>
              {categoryCounts[item] ?? 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function sortHandler({ onSortChange }: PlaybookPickerView) {
  if (!onSortChange) return undefined;
  return (value: string) => {
    if (isTemplateSort(value)) onSortChange(value);
  };
}

function clearFiltersHandler({ onSearchChange, onCategoryChange }: PlaybookPickerView) {
  if (!onSearchChange || !onCategoryChange) return undefined;
  return () => {
    onSearchChange("");
    onCategoryChange("All");
  };
}
