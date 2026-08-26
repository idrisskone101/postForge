import type { RefObject } from "react";
import type {
  CollectionAssetRecord,
  CollectionFeatureRecord,
  CollectionRecord,
} from "@/lib/collections";

export type CollectionsPageClientProps = {
  initialRecords: CollectionFeatureRecord[];
  openUploader?: boolean;
};

export type CollectionsWorkspace = {
  inputRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  error: string | null;
  search: string;
  active: CollectionRecord | null;
  selected: string | null;
  selectedAsset: CollectionAssetRecord | null;
  pinterestOpen: boolean;
  toast: string | null;
  assets: CollectionAssetRecord[];
  collections: CollectionRecord[];
  filteredAssets: CollectionAssetRecord[];
  isEmpty: boolean;
  setError: (error: string | null) => void;
  setSearch: (search: string) => void;
  setActive: (collection: CollectionRecord | null) => void;
  setPinterestOpen: (open: boolean) => void;
  upload: (files: FileList | File[]) => Promise<void>;
  createCollection: () => Promise<void>;
  toggleAsset: (collection: CollectionRecord, assetId: string) => Promise<void>;
  deleteCollection: (collection: CollectionRecord) => Promise<void>;
  deleteAsset: (asset: CollectionAssetRecord) => Promise<void>;
  load: () => Promise<void>;
  notify: (message: string) => void;
  openFilePicker: () => void;
  toggleSelectedAsset: (assetId: string) => void;
};

export type CollectionsEmptyProps = {
  uploading: boolean;
  onUpload: () => void;
  onPinterest: () => void;
};

export type CollectionsLibraryModel = {
  collections: CollectionRecord[];
  assets: CollectionAssetRecord[];
  filteredAssets: CollectionAssetRecord[];
  search: string;
  selectedId: string | null;
  selectedAsset: CollectionAssetRecord | null;
  uploading: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (assetId: string) => void;
  onOpenCollection: (collection: CollectionRecord) => void;
  onCreateCollection: () => void;
  onDeleteAsset: (asset: CollectionAssetRecord) => void;
  onChooseFiles: () => void;
  onPinterest: () => void;
};

export type CollectionsDetailModel = {
  collection: CollectionRecord;
  assets: CollectionAssetRecord[];
  onClose: () => void;
  onAddImages: () => void;
  onDelete: () => void;
  onToggleAsset: (assetId: string) => void;
};
