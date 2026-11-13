import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CloneModelSelectModel } from "@/components/clone/view-models";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CloneModelSelect({
  model,
  className,
}: {
  model: CloneModelSelectModel;
  className?: string;
}) {
  const { label, models, selectedValue, onValueChange, getCost } = model;
  const selectedModel = models.find((entry) => entry.id === selectedValue) ?? models[0];
  const selectedModelLabel = selectedModel?.name.replace(" Motion Control", "");

  if (models.length === 0) {
    return (
      <Link
        href="/settings?tab=models"
        aria-label={`${label}: no model enabled. Open model settings`}
        className={cn(
          "flex h-[42px] w-full min-w-0 items-center justify-between gap-3 rounded-lg bg-raised px-3 text-[14px] font-medium leading-[18px] text-fg-muted transition-[background-color] duration-[160ms] ease-pf hover:bg-raised-strong",
          className,
        )}
      >
        <span className="min-w-0 truncate">No model enabled</span>
        <span className="shrink-0 text-fg-secondary">Settings</span>
      </Link>
    );
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={(value) => {
        if (value) onValueChange(value);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={cn("h-[42px]! w-full min-w-0 py-0 pr-3 [&>span]:min-w-0 [&>span]:flex-1 [&>svg]:size-3.5", className)}
      >
        <SelectValue>
          {() => (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
              <span className="min-w-0 truncate text-left text-[14px] font-medium leading-[18px]">
                {selectedModelLabel ?? "Select model"}
              </span>
              {selectedModel ? (
                <span className="wb-mono shrink-0 text-fg-muted">{getCost(selectedModel.id)}</span>
              ) : null}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
        <SelectGroup>
          {models.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                <span className="min-w-0 truncate text-[14px] font-medium">{entry.name}</span>
                <span className="wb-mono shrink-0 text-fg-muted">{getCost(entry.id)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
