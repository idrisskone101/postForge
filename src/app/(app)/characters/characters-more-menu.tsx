"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iconButtonClass } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CharacterInspectorModel } from "./types";

/** The inspector's overflow: the two actions that are not worth a button of their own. */
export function CharacterMoreMenu({
  inspector,
  large = false,
}: {
  inspector: CharacterInspectorModel;
  large?: boolean;
}) {
  const { record, busy, onDuplicate, onRequestDelete } = inspector;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(iconButtonClass("quiet", 40), "shrink-0", large && "size-11")}
        aria-label={`More actions for ${record.name}`}
      >
        <MoreHorizontal className="size-[18px]" strokeWidth={1.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className="wb-float w-48 p-1">
        <DropdownMenuItem className={ITEM_CLASS} disabled={busy} onClick={() => onDuplicate(record)}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className={ITEM_CLASS}
          disabled={busy}
          onClick={() => onRequestDelete(record)}
        >
          Delete character
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ITEM_CLASS = "h-9 rounded-full px-3 text-[13px] font-medium";
