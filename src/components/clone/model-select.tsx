import { cn } from "@/lib/utils";
import type { ModelDefinition } from "@/lib/ai/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CloneModelSelect({
  label,
  description,
  accentClassName,
  className,
  models,
  selectedValue,
  onValueChange,
  getCost,
}: {
  label: string;
  description: string;
  accentClassName: string;
  className?: string;
  models: ModelDefinition[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  getCost: (modelId: string) => string;
}) {
  const selectedModel = models.find((model) => model.id === selectedValue) ?? models[0];
  const compactLabel = label === "Final video" ? "Video" : label === "Reference image" ? "Reference" : label;
  const selectedModelLabel = selectedModel?.name.replace(" Motion Control", "");

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">
        {label}
      </legend>
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          if (value) onValueChange(value);
        }}
      >
        <SelectTrigger
          aria-label={label}
          className="h-10! min-h-10 w-full min-w-0 border-border bg-white px-3 py-2 text-foreground hover:bg-muted dark:bg-muted/50 dark:text-white dark:hover:bg-muted [&>span]:min-w-0 [&>span]:flex-1"
        >
          <SelectValue>
            {() => (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                <span className="min-w-0 flex-1 overflow-hidden text-left">
                  <span className={cn("block text-[12px] font-bold uppercase tracking-wider", accentClassName)}>
                    {compactLabel}
                  </span>
                  <span className="block truncate text-[13px] font-semibold leading-4">
                    {selectedModelLabel ?? "Select model"}
                  </span>
                </span>
                {selectedModel ? (
                  <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                    {getCost(selectedModel.id)}
                  </span>
                ) : null}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
          <SelectGroup>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-xs font-bold">
                      {model.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                    {getCost(model.id)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </fieldset>
  );
}
