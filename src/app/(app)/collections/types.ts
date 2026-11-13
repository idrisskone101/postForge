import type { RefObject } from "react";
import type { ToastMessage } from "@/components/workbench";
import type {
  CollectionAssetRecord,
  CollectionFeatureRecord,
  CollectionRecord,
} from "@/lib/collections";
import type { CollectionUsage } from "./collection-usage";

export type CollectionsPageClientProps = {
  initialRecords: CollectionFeatureRecord[];
  /** Counted on the server with the records. Absent for a collection made in this session. */
  usage?: CollectionUsage;
  openUploader?: boolean;
};

export type UploadProgress = { done: number; total: number };

export type CollectionsWorkspace = {
  inputRef: RefObject<HTMLInputElement | null>;
  uploadProgress: UploadProgress | null;
  error: string | null;
  search: string;
  active: CollectionRecord | null;
  selectedAsset: CollectionAssetRecord | null;
  pinterestOpen: boolean;
  toast: ToastMessage | null;
  assets: CollectionAssetRecord[];
  collections: CollectionRecord[];
  usage: CollectionUsage;
  filteredAssets: CollectionAssetRecord[];
  isEmpty: boolean;
  dismissError: () => void;
  dismissToast: () => void;
  setSearch: (search: string) => void;
  setActiveId: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setPinterestOpen: (open: boolean) => void;
  upload: (files: FileList | File[]) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (collection: CollectionRecord, name: string) => Promise<void>;
  toggleAsset: (collection: CollectionRecord, assetId: string) => Promise<void>;
  deleteCollection: (collection: CollectionRecord) => Promise<void>;
  deleteAsset: (asset: CollectionAssetRecord) => Promise<void>;
  load: () => Promise<void>;
  notify: (message: string) => void;
  openFilePicker: () => void;
  toggleSelectedAsset: (assetId: string) => void;
};

export type CollectionsDetailModel = {
  collection: CollectionRecord;
  assets: CollectionAssetRecord[];
  uploadProgress: UploadProgress | null;
  onClose: () => void;
  onAddImages: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleAsset: (assetId: string) => void;
  onDropFiles: (files: FileList) => void;
};

export type ConfirmRequest = {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
};
