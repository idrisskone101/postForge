import type { PinterestCandidate } from "@/lib/collections-client";
import type { PinterestCandidateSource } from "@/lib/collections/pinterest-types";

export type PinterestImportWorkflow = "collection" | "slideshow";
export type PinterestImportAction = "import" | "direct" | "vibe";

export type PinterestImportWorkspace = {
  source: PinterestCandidateSource;
  query: string;
  sourceIsValid: boolean;
  workflow: PinterestImportWorkflow;
  collectionName: string;
  candidates: PinterestCandidate[];
  selected: string[];
  failedImages: string[];
  searching: boolean;
  loadingMore: boolean;
  importing: boolean;
  hasSearched: boolean;
  hasMore: boolean;
  error: string | null;
  pendingAction: PinterestImportAction | null;
  changeSource: (source: PinterestCandidateSource) => void;
  updateQuery: (value: string) => void;
  runSearch: () => void;
  loadMore: () => void;
  toggleSelected: (id: string) => void;
  markCandidateImageFailed: (id: string) => void;
  updateCollectionName: (value: string) => void;
  setSelected: (ids: string[]) => void;
  runImport: (action: PinterestImportAction) => void;
};
