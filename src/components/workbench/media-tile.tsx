import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { StatusBadge, type StatusTone } from "./status-badge";

export type MediaTileState = {
  /** Draws the ember ring and the filled check. */
  selected?: boolean;
  /** Called by the top-left check. Omit for tiles that cannot be selected. */
  onSelectedChange?: (selected: boolean) => void;
  /** Top-right 22px status badge. */
  status?: { tone: StatusTone; label: string };
  /** Formatted duration for video, e.g. "0:14". */
  duration?: string;
  /** Name used by the selection control, e.g. the output title. */
  name?: string;
  /** Keep every check visible, e.g. while a multi-select is in progress. */
  selecting?: boolean;
  /** Keep the action row on touch screens. Only for a row that is the sole way to its action. */
  touchActions?: boolean;
};

type MediaTileProps = {
  /** The media: an `<img>`, `<video>` or the app's own media component. It fills the tile. */
  children: ReactNode;
  state?: MediaTileState;
  /** Hover action row: `wb-tile-action` buttons or links. The first one reads as primary. */
  actions?: ReactNode;
  /** Sizing classes, e.g. "aspect-[3/4]" or "h-[236px]". */
  className?: string;
};

/** 12px media tile. Hover lifts the action row 4px; the image never zooms. */
export function MediaTile({ children, state = {}, actions, className }: MediaTileProps) {
  const { selected = false, onSelectedChange, status, duration, name, selecting, touchActions } = state;
  return (
    <div
      className={cn("wb-tile", className)}
      data-selected={selected ? "true" : undefined}
      data-selecting={selecting ? "true" : undefined}
    >
      {children}
      {onSelectedChange && (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={name ? `Select ${name}` : "Select"}
          className="wb-tile-check"
          onClick={() => onSelectedChange(!selected)}
        >
          <Icon name="check" size={12} strokeWidth={3} />
        </button>
      )}
      {status && (
        <StatusBadge tone={status.tone} label={status.label} className="wb-tile-badge" />
      )}
      {actions && (
        <div className="wb-tile-actions" data-touch={touchActions ? "keep" : undefined}>
          {actions}
        </div>
      )}
      {duration && <span className="wb-tile-duration">{duration}</span>}
    </div>
  );
}
