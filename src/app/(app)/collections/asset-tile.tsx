/* eslint-disable @next/next/no-img-element */
import { MediaTile } from "@/components/workbench";
import type { CollectionAssetRecord } from "@/lib/collections";
import { assetUrl } from "./collections-helpers";

export function AssetTile({
  asset,
  selected,
  onToggle,
}: {
  asset: CollectionAssetRecord;
  selected: boolean;
  onToggle: (assetId: string) => void;
}) {
  return (
    <MediaTile
      className="aspect-[428/543]"
      state={{ selected, onSelectedChange: () => onToggle(asset.id), name: asset.name }}
    >
      <img
        src={assetUrl(asset.id)}
        alt={asset.name}
        title={asset.name}
        loading="lazy"
        decoding="async"
        className="cursor-pointer"
        onClick={() => onToggle(asset.id)}
      />
    </MediaTile>
  );
}
