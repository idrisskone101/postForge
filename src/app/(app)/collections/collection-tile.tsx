/* eslint-disable @next/next/no-img-element */
import { Icon } from "@/components/workbench";
import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";
import { cn } from "@/lib/utils";
import { assetUrl, assetsForCollection, formatShortDate } from "./collections-helpers";

export function CollectionTile({
  collection,
  assets,
  priority,
  onOpen,
}: {
  collection: CollectionRecord;
  assets: CollectionAssetRecord[];
  priority: boolean;
  onOpen: (id: string) => void;
}) {
  const [lead, ...rest] = assetsForCollection(collection, assets).slice(0, 4);
  const side = rest.length === 3 ? rest : rest.slice(0, 2);

  return (
    <button
      type="button"
      onClick={() => onOpen(collection.id)}
      className="group flex min-w-0 flex-col gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-4 focus-visible:ring-offset-panel max-sm:w-[240px] max-sm:shrink-0 max-sm:snap-start"
    >
      <span className="flex h-[196px] w-full gap-1 overflow-hidden rounded-lg bg-media shadow-[0_0_0_0_var(--pf-outline)] transition-shadow duration-[var(--pf-dur-feedback)] ease-pf group-hover:shadow-[0_0_0_1px_var(--pf-outline)]">
        {lead ? (
          <MosaicImage asset={lead} priority={priority} className="h-full flex-[1.7_1_0%]" />
        ) : (
          <span className="grid flex-1 place-items-center text-fg-muted">
            <Icon name="collections" size={22} />
          </span>
        )}
        {side.length > 0 ? (
          <span className="flex min-w-0 flex-[1_1_0%] flex-col gap-1">
            {side.map((asset) => (
              <MosaicImage key={asset.id} asset={asset} priority={false} className="flex-1" />
            ))}
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold leading-[18px] text-fg">
            {collection.name}
          </span>
          <span className="truncate text-[13px] leading-4 text-fg-muted">
            Updated {formatShortDate(collection.updatedAt)}
          </span>
        </span>
        <span className="wb-mono shrink-0 text-fg-secondary">{collection.assetIds.length}</span>
      </span>
    </button>
  );
}

function MosaicImage({
  asset,
  priority,
  className,
}: {
  asset: CollectionAssetRecord;
  priority: boolean;
  className?: string;
}) {
  return (
    <img
      src={assetUrl(asset.id)}
      alt=""
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("block min-h-0 w-full min-w-0 object-cover", className)}
    />
  );
}
