"use client";

import { Icon } from "@/components/workbench";
import { platformCollectionAssetUrl } from "@/lib/collections-client";

export function CreatorSlideImageSlot({
  assetId,
  label,
  onPick,
  onClear,
}: {
  assetId: string | null;
  label: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative size-[42px] shrink-0 self-start">
      <button
        type="button"
        onClick={onPick}
        aria-label={
          assetId
            ? `Change ${label} image`
            : `Add ${label} image from collections`
        }
        title={assetId ? `Change ${label} image` : `Add ${label} image from collections`}
        className={
          assetId
            ? "size-full overflow-hidden rounded-lg bg-media transition-shadow duration-[var(--pf-dur-feedback)] ease-pf hover:shadow-[0_0_0_2px_var(--pf-outline)]"
            : "grid size-full place-items-center rounded-lg bg-raised text-fg-secondary shadow-[inset_0_0_0_1px_var(--pf-outline)] transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong hover:text-fg"
        }
      >
        {assetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={platformCollectionAssetUrl(assetId)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Icon name="plus" size={16} />
        )}
      </button>
      {assetId ? (
        <button
          type="button"
          aria-label={`Remove ${label} image`}
          title={`Remove ${label} image`}
          onClick={onClear}
          className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-strong text-strong-fg shadow-[0_0_0_2px_var(--pf-panel)] transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad-tint hover:text-bad"
        >
          <Icon name="x" size={12} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
